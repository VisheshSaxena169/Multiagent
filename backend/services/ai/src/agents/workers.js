const fs = require("fs");
const path = require("path");
const axios = require("axios");
const PDFDocument = require("pdfkit");
const { SystemMessage, HumanMessage, AIMessage } = require("@langchain/core/messages");
const { supervisorLLM, llm } = require("./llm");
const { z } = require("zod");
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");



const extractAndSaveMemory = async (messageText, userId) => {
    try {
        console.log("DEBUG 1: Extractor called with User ID:", userId);
        // Force the AI to return structured JSON
        const memorySchema = z.object({
            isFact: z.boolean().describe("True ONLY if the user shares a permanent personal fact, name, job, or preference."),
            fact: z.string().optional().describe("The exact fact to save, written in third-person (e.g., 'The user's name is Vishesh').")
        });

        // Bind the schema to your ultra-fast routing model
        const extractor = supervisorLLM.withStructuredOutput(memorySchema);
        
        const decision = await extractor.invoke([
            new SystemMessage("You are a memory extraction tool. Look at the user's message. If they state a permanent fact about themselves, extract it. If it is just a question or normal chat, return false."),
            new HumanMessage(messageText)
        ], { callbacks: [] });

        console.log("DEBUG 2: AI Extractor Decision ->", decision);
        // If a fact is found, save it to the database
        if (decision.isFact && decision.fact) {
            const authUrl = process.env.AUTH_SERVICE_URL ;
axios.post(`${authUrl}/memory/${userId}`, { fact: decision.fact });            console.log("[MEMORY SAVED] ->", decision.fact);
        }
    } catch (error) {
        console.error("DEBUG ERROR: Memory extraction failed ->", error.message);
        console.error("Background memory extraction failed:", error.message);
    }
};



const chatAgentNode = async (state) => {
    // 1. Extract userId from your LangGraph state
    // (Make sure your graph schema allows 'userId' and you pass it in from req.body!)
    const userId = state.userId; 
    console.log("DEBUG 4: LangGraph State User ID ->", userId);
    
    const messages = state.messages;
    const latestMsg = messages[messages.length - 1];
    
    // 1. Fire the extractor in the background
    // CRITICAL: Notice we do NOT use 'await' here. We want it to run invisibly 
    // in the background so the chat streaming starts instantly!
    if (userId && latestMsg && latestMsg.content) {
        extractAndSaveMemory(latestMsg.content, userId);
    }


    let memoryText = "";
    
    try {
        // 2. Fetch the saved facts for this specific user
        if (userId) {
            const authUrl = process.env.AUTH_SERVICE_URL ;
            const response = await axios.get(`${authUrl}/memory/${userId}`);
            console.log("DEBUG 5: Auth DB returned ->", response.data);
                        if (response.data && response.data.memory && response.data.memory.length > 0) {
                memoryText = response.data.memory.join('\n- ');
            }
        }
    } catch (error) {
        console.log("DEBUG 6: Failed to fetch memory ->", error.message);
        console.error("Failed to fetch user memory:", error.message);
        // We continue even if it fails, so the chat doesn't break
    }

    // 3. Build the dynamic system prompt
    const basePrompt = "You are a helpful, friendly AI assistant. Answer the user's questions clearly and concisely.";
    const memoryPrompt = memoryText 
        ? `\n\nHere are important facts you must remember about this user:\n- ${memoryText}\n\nUse these facts naturally in conversation without explicitly stating that you are reading from memory.` 
        : "";

    const systemMessage = new SystemMessage(basePrompt + memoryPrompt);
    
    // 4. Pass the combined prompt to Gemini
    const response = await llm.invoke([systemMessage, ...state.messages]);
    
    return { messages: [response] }; 
};

const codeAgentNode = async (state) => {
    const systemMessage = new SystemMessage(
        `You are an expert Senior Software Engineer. 
        Provide clean, modular, and well-commented code.
        CRITICAL RULE: If the user asks you to build a UI component, web app, or tool (like a calculator), you MUST output a single, complete, runnable HTML file with all CSS and JavaScript written inline. 
        Always wrap your code in standard markdown code blocks with the language specified.`
    );
    const response = await llm.invoke([systemMessage, ...state.messages]);
    return { messages: [response] };
};



const pdfAgentNode = async (state) => {
    const messages = state.messages;
    const latestMsg = messages[messages.length - 1];

    let rawText = typeof latestMsg.content === 'string' ? latestMsg.content : "";
    const cleanText = rawText.replace(/\[.*?\]\s*/g, '').trim();

    const systemPrompt = new SystemMessage(
        "You are an expert document generator. Write the content for this PDF clearly, using professional language. Do not include markdown formatting like ** or ##, just plain readable text structured well."
    );
    
    let pdfContent = "";

    try {
        console.time("[TIMER] PDF Content Generation");
        
        // Use the standard model to avoid the 'lite' model's 503 traffic errors
        const pdfLLM = new ChatGoogleGenerativeAI({
            apiKey: process.env.GEMINI_API_KEY,
            model: "gemini-3.5-flash", 
            temperature: 0.2
        });

        const aiResponse = await pdfLLM.invoke(
            [systemPrompt, new HumanMessage(cleanText)],
            { callbacks: [] } 
        );
        
        pdfContent = typeof aiResponse.content === 'string' ? aiResponse.content : JSON.stringify(aiResponse.content);
        pdfContent = pdfContent.replace(/[^\x00-\x7F]/g, " "); 
        console.timeEnd("[TIMER] PDF Content Generation");
    } catch (error) {
        console.error("LLM Error during PDF generation:", error.message);
        pdfContent = `API ERROR: The AI servers are currently overloaded.\n\nPlease try again in a few minutes.`;
    }

    const pdfDir = path.join(process.cwd(), "public", "pdfs");
    if (!fs.existsSync(pdfDir)) {
        fs.mkdirSync(pdfDir, { recursive: true });
    }

    const fileName = `Document_${Date.now()}.pdf`;
    const filePath = path.join(pdfDir, fileName);
    
    return new Promise((resolve) => {
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(filePath);
        
        // CRITICAL FIX: Pipe immediately so we don't lose the PDF headers!
        doc.pipe(stream);
        
        // Write the text
        doc.font('Helvetica').fillColor('black').fontSize(20).text("Workspace AI Generated Report", { align: 'center' });
        doc.moveDown();
        
        if (!pdfContent || !pdfContent.trim()) {
            pdfContent = "The AI generated an empty response.";
        }
        
        doc.font('Helvetica').fontSize(12).text(pdfContent, { align: 'left' });
        
        // End the document to flush the data to the stream
        doc.end();

        // Wait for Windows to physically close the file handle before telling the frontend it's ready
        stream.on("close", () => {
            const downloadMessage = `I have generated your document!\n\n[📥 Click here to download ${fileName}](http://zyqon.duckdns.org:3002/pdfs/${fileName})`;
            resolve({ messages: [new AIMessage(downloadMessage)] });
        });
        
        stream.on("error", (err) => {
            console.error("PDF Write Error:", err);
            resolve({ messages: [new AIMessage("Sorry, I failed to create the PDF file on the server.")] });
        });
    });
};

module.exports = { chatAgentNode, codeAgentNode,pdfAgentNode };