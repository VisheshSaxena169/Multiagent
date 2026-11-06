const { RemoveMessage } = require("@langchain/core/messages");
const { getVectorStore } = require("./memory");

const extractText = (msg) => {
    if (typeof msg.content === 'string') return msg.content;
    if (Array.isArray(msg.content)) return msg.content.map(c => c.text || '').join(' ');
    return '';
};

/**
 * NODE 1: Retrieve context, inject it, and save the original prompt.
 */
const injectPastContext = async (state, config) => {
    const threadId = config.configurable?.thread_id;
    const messages = state.messages;
    
    const latestUserMessage = messages[messages.length - 1];

    if (!latestUserMessage || latestUserMessage._getType() !== "human") {
        return { messages: [] }; 
    }

    try {
        const vectorStore = getVectorStore();
        
        // Safety check: always use the clean prompt for searching
        const query = latestUserMessage.additional_kwargs?.original_prompt || extractText(latestUserMessage);

        console.log(`[RAG] Searching for context regarding: "${query}"`);

        console.time("[TIMER] Vector Search");
        // Use similaritySearchWithScore to filter out low-quality matches
        const rawResults = await vectorStore.similaritySearchWithScore(query, 5, {
            preFilter: { thread_id: { $eq: threadId } }
        });


        console.timeEnd("[TIMER] Vector Search");
        // Filter out bad matches (Score > 0.75 prevents unrelated context injection)
        const results = rawResults
            .filter(([doc, score]) => score > 0.75)
            .map(([doc, score]) => doc);

        console.log(`[RAG] Found ${results.length} highly relevant archived messages.`);

        if (results.length > 0) {
            const contextText = results.map(r => `[Archived ${r.metadata.role}]: ${r.pageContent}`).join("\n\n");
            
            // 1. Save the original clean prompt into the metadata tracker
            latestUserMessage.additional_kwargs = { 
                ...latestUserMessage.additional_kwargs, 
                original_prompt: query 
            };
            
            // 2. Overwrite the text for the LLM to read
            latestUserMessage.content = `Here is some context from older parts of our conversation:\n\n${contextText}\n\n--- End of Context ---\n\nUser's current prompt: ${query}`;
            
            return { messages: [latestUserMessage] };
        }
    } catch (error) {
        console.error("RAG Retrieval Failed:", error);
    }
    
    return { messages: [] };
};

/**
 * NODE 2: Revert the injected context to keep the DB clean, then prune.
 */
const pruneMemory = async (state, config) => {
    const RECENT_LIMIT = 20; 
    const messages = state.messages;
    const commands = [];

    // 1. REVERT THE MUTATED MESSAGE FIRST
    // Find if any message has the temporary RAG context flag
    const modifiedMsg = messages.find(m => m.additional_kwargs && m.additional_kwargs.original_prompt);
    
    if (modifiedMsg) {
        // Restore the clean string so the UI and Vector DB only see the user's actual words
        modifiedMsg.content = modifiedMsg.additional_kwargs.original_prompt;
        delete modifiedMsg.additional_kwargs.original_prompt; // Remove the flag
        commands.push(modifiedMsg); // Overwrite in LangGraph state
    }

    if (!messages || messages.length <= RECENT_LIMIT) {
        // Return commands to ensure the message gets scrubbed even if we aren't archiving
        return { messages: commands };
    }

    const threadId = config.configurable?.thread_id;
    const messagesToArchive = messages.slice(0, messages.length - RECENT_LIMIT);

    try {
        const vectorStore = getVectorStore();
        const docsToStore = [];

        for (const msg of messagesToArchive) {
            const textContent = extractText(msg);
            
            if (textContent) {
                docsToStore.push({
                    pageContent: textContent,
                    metadata: { 
                        thread_id: threadId, 
                        role: msg._getType(),
                        timestamp: new Date()
                    }
                });
            }
            
            if (msg.id) {
                commands.push(new RemoveMessage({ id: msg.id }));
            }
        }

        if (docsToStore.length > 0) {
            await vectorStore.addDocuments(docsToStore);
        }

        return { messages: commands };

    } catch (error) {
        console.error("Failed to archive messages. Keeping in active memory:", error);
        return { messages: commands };
    }
};

module.exports = { injectPastContext, pruneMemory };