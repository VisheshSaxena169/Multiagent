const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");

const llm = new ChatGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
    model: "gemini-3.5-flash-lite",
    modelName: "gemini-3.5-flash", // Fast and efficient for routing
    temperature: 0.2,
});


// 1. Ultra-fast model strictly for the Supervisor decision
const supervisorLLM = new ChatGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
    model: "gemini-3.5-flash-lite", 
    temperature: 0, // Must be 0 for deterministic routing
});

module.exports = { supervisorLLM,llm };