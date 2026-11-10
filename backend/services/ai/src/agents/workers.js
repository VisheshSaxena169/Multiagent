const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const { SystemMessage, HumanMessage, AIMessage } = require("@langchain/core/messages");
const { llm } = require("./llm");
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");

const chatAgentNode = async (state) => {
    const systemMessage = new SystemMessage(
        "You are a helpful, friendly AI assistant. Answer the user's questions clearly and concisely."
    );
    const response = await llm.invoke([systemMessage, ...state.messages]);
    return { messages: [response] }; // LangGraph automatically appends this to the state
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