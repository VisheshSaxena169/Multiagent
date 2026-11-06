// backend/services/ai/app.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { buildWorkflow } = require("./graph/workflow");
const { HumanMessage } = require("@langchain/core/messages");
const jwt = require("jsonwebtoken");
const { MongoClient } = require("mongodb");
const path = require("path");

const app = express();
app.use(express.json());

let appWorkflow;

// Initialize LangGraph before accepting requests
buildWorkflow().then(workflow => {
    appWorkflow = workflow;
}).catch(console.error);



// 1. Connect a native client just for querying the history list
const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;
mongoClient.connect().then(() => {
    db = mongoClient.db("multi_agent_db");
}).catch(console.error);


// DIAGNOSTIC MIDDLEWARE: Pinpoint exactly why the token fails
const requireAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    console.log("--- Auth Check ---");
    console.log("1. Header received:", authHeader ? "Yes" : "No");

    if (!authHeader) return res.status(401).json({ error: "Unauthorized: No header" });

    // Safely extract token whether it has "Bearer " prefix or not
    const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader;
    
    try {
        console.log("2. JWT_SECRET loaded:", process.env.JWT_ACCESS_SECRET ? "Yes" : "No (Check .env file!)");
        
        // This will throw an error if it fails
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        
        console.log("3. Token decoded successfully! Payload:", decoded);
        
        req.userId = decoded.id || decoded.userId || decoded._id; 
        
        if (!req.userId) {
            console.log("4. Warning: Token is valid but userId is missing from payload!");
        }

        next();
    } catch (error) {
        // THIS is what we need to see in the terminal!
        console.error("JWT Verification Failed:", error.message);
        return res.status(401).json({ error: `Token error: ${error.message}` });
    }
};

// 2. Route: Get a list of all past threads
// 2. Route: Get a list of all past threads
app.get("/history", requireAuth, async (req, res) => {
    try {
        // FIXED: Filter strictly by the logged-in user's ID
        const threads = await db.collection("threads")
            .find({ userId: req.userId }) 
            .sort({ createdAt: -1 })
            .toArray(); 
        res.json({ success: true, threads });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch history list" });
    }
});

// 3. Route: Get the message history for one specific thread
app.get("/history/:threadId",requireAuth, async (req, res) => {
    try {
        if (!appWorkflow) return res.status(500).json({ error: "AI not ready" });

        // FIXED: Security check - Does this thread belong to the user requesting it?
        const threadMeta = await db.collection("threads").findOne({ threadId: req.params.threadId });
        if (threadMeta && threadMeta.userId !== req.userId) {
            return res.status(403).json({ error: "Unauthorized access to this chat" });
        }

        // Use LangGraph's built-in state fetcher to grab the memory
        const config = { configurable: { thread_id: req.params.threadId } };
        const state = await appWorkflow.getState(config);

        if (!state || !state.values || !state.values.messages) {
            return res.json({ success: true, messages: [] });
        }

        // FIXED: Bulletproof detection for Human messages restored from MongoDB
       // FIXED: Now we check for 'role: user' which matches your exact input format
        const formattedMessages = state.values.messages.map(msg => {
            let isHuman = false;
            
            // 1. Check if it's the raw input format we sent
            if (msg.role === 'user' || msg.role === 'human') isHuman = true;
            
            // 2. Check if it's a LangChain serialized class
            else if (msg.type === 'human') isHuman = true;
            else if (typeof msg.getType === 'function' && msg.getType() === 'human') isHuman = true;
            else if (typeof msg._getType === 'function' && msg._getType() === 'human') isHuman = true;
            else if (Array.isArray(msg.id) && msg.id.includes('HumanMessage')) isHuman = true;
            
            // 3. Safely extract the content depending on how MongoDB stored it
            const msgContent = msg.content || (msg.kwargs && msg.kwargs.content) || "";

            return {
                role: isHuman ? "user" : "ai",
                content: msgContent
            };
        });

        res.json({ success: true, messages: formattedMessages });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch thread messages" });
    }
});

app.post("/chat",requireAuth, async (req, res) => {
    const { prompt, threadId } = req.body;

    if (!appWorkflow) return res.status(500).json({ error: "AI initializing..." });

    try {
        // QUICK CHECK: Have we saved a title for this thread yet?
        const threadExists = await db.collection("threads").findOne({ threadId });
        
       if (!threadExists) {
            const cleanPrompt = prompt.replace(/\[.*?\]\s*/g, '');
            const title = cleanPrompt.length > 30 ? cleanPrompt.substring(0, 30) + "..." : cleanPrompt;
            
            await db.collection("threads").insertOne({
                threadId,
                title,
                userId: req.userId, // FIXED: Bind the thread to the user
                createdAt: new Date()
            });
        }
    } catch (dbError) {
        console.error("Failed to save thread title:", dbError);
    }


    // 1. Setup headers for Server-Sent Events (Streaming)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
        // FIXED: version "v2" is now bundled inside the config object
        const config = {
            configurable: { thread_id: threadId },
            version: "v2"
        };
// --- DIRECT CHAT BYPASS LOGIC ---
        const msgLower = prompt.toLowerCase();
        const isCode = ["code", "debug", "error", "react", "node", "api", "database", "mongodb"].some(kw => msgLower.includes(kw));
        const isPdf = ["pdf", "document", "summarize", "file", "report"].some(kw => msgLower.includes(kw));

        let fastRoute = "chatAgent"; 
        let skipSupervisor = false;

        // If it explicitly needs a specialized agent, bypass supervisor and send it straight there
        if (isPdf) { 
            fastRoute = "pdfAgent"; 
            skipSupervisor = true; 
        } else if (isCode) { 
            fastRoute = "codeAgent"; 
            skipSupervisor = true; 
        } else if (msgLower.length < 50 && !msgLower.includes("?")) { 
            // Simple greetings ("hello", "good morning") skip the supervisor entirely
            fastRoute = "chatAgent"; 
            skipSupervisor = true; 
        }
       // 1. CRITICAL FIX: Strip out the UI instruction tags completely 
        // before passing the message to LangGraph or the LLM.
        const cleanPrompt = prompt.replace(/\[.*?\]\s*/g, '').trim();

        // Pass the bypass instructions into the LangGraph state
        const inputs = { 
            messages: [{ role: "user", content: cleanPrompt }],
            nextAgent: fastRoute,
            skipSupervisor: skipSupervisor
        };
        // 2. Stream events as they happen in the graph (using only 2 arguments)
        const stream = await appWorkflow.streamEvents(inputs, config);

        for await (const event of stream) {
            // 1. Stream ONLY the tokens from the chat/code agents
            if (
                event.event === "on_chat_model_stream" &&
                event.metadata?.langgraph_node !== "supervisor"
            ) {
                const chunk = event.data.chunk.content;
                if (chunk) {
                    res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
                }
            }

            // 2. CRITICAL FIX: Catch the final download link from the PDF Agent
            if (event.event === "on_chain_end" && event.name === "pdfAgent") {
                const output = event.data.output;
                if (output && output.messages && output.messages.length > 0) {
                    // Extract the "I have generated your document!" link
                    const finalMsg = output.messages[output.messages.length - 1];
                    const pdfText = finalMsg.content;
                    if (pdfText) {
                        res.write(`data: ${JSON.stringify({ chunk: pdfText })}\n\n`);
                    }
                }
            }
        }
        // Close the stream when execution finishes
        res.write(`data: [DONE]\n\n`);
        res.end();

    } catch (error) {
        console.error(error);
        res.write(`data: ${JSON.stringify({ error: "AI execution failed" })}\n\n`);
        res.end();
    }
});

// Expose the public folder so the frontend can download the PDFs
app.use("/pdfs", express.static(path.join(process.cwd(), "public", "pdfs")));

// 4. Route: Update (Rename) a chat title
app.put("/history/:threadId", requireAuth, async (req, res) => {
    try {
        const { title } = req.body;
        if (!title || !title.trim()) {
            return res.status(400).json({ error: "Title is required" });
        }

        // Check if thread exists and belongs to the user
        const threadMeta = await db.collection("threads").findOne({ threadId: req.params.threadId });
        if (!threadMeta) return res.status(404).json({ error: "Chat not found" });
        if (threadMeta.userId !== req.userId) return res.status(403).json({ error: "Unauthorized" });

        // Update the title in MongoDB
        await db.collection("threads").updateOne(
            { threadId: req.params.threadId },
            { $set: { title: title.trim() } }
        );

        res.json({ success: true, message: "Chat renamed successfully" });
    } catch (error) {
        console.error("Rename error:", error);
        res.status(500).json({ error: "Failed to rename chat" });
    }
});

// 5. Route: Delete a chat completely
app.delete("/history/:threadId", requireAuth, async (req, res) => {
    try {
        // Check if thread exists and belongs to the user
        const threadMeta = await db.collection("threads").findOne({ threadId: req.params.threadId });
        if (!threadMeta) return res.status(404).json({ error: "Chat not found" });
        if (threadMeta.userId !== req.userId) return res.status(403).json({ error: "Unauthorized" });

        // 1. Delete the title metadata from our custom collection
        await db.collection("threads").deleteOne({ threadId: req.params.threadId });
        
        // 2. Delete the actual messages from LangGraph's internal checkpoint collections
        // (LangGraph uses 'thread_id' internally, not 'threadId')
        await db.collection("checkpoints").deleteMany({ thread_id: req.params.threadId });
        await db.collection("checkpoint_writes").deleteMany({ thread_id: req.params.threadId });

        res.json({ success: true, message: "Chat deleted successfully" });
    } catch (error) {
        console.error("Delete error:", error);
        res.status(500).json({ error: "Failed to delete chat" });
    }
});

app.listen(3002, () => console.log("AI Service running on port 3002"));