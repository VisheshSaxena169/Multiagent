

const { MongoClient } = require("mongodb");
const { MongoDBSaver } = require("@langchain/langgraph-checkpoint-mongodb");
const { MongoDBAtlasVectorSearch } = require("@langchain/mongodb");
const { GoogleGenerativeAIEmbeddings } = require("@langchain/google-genai");

let checkpointer = null;
let vectorStore = null;

const initializeMemory = async () => {
    if (checkpointer && vectorStore) return { checkpointer, vectorStore };

    try {
        const client = new MongoClient(process.env.MONGO_URI);
        await client.connect();
        
        const db = client.db("multi_agent_db");
        
        // 1. Initialize Active State Checkpointer (Recent Messages)
        checkpointer = new MongoDBSaver({ 
            client: client,
            dbName: "multi_agent_db" 
        });

        // 2. Initialize RAG Vector Store (Older Messages)
        const collection = db.collection("archived_messages");
        
        // 3. Use the correct GoogleGenerativeAIEmbeddings constructor here
        vectorStore = new MongoDBAtlasVectorSearch(
            new GoogleGenerativeAIEmbeddings({ 
                apiKey: process.env.GEMINI_API_KEY,
               model: "gemini-embedding-001", // FIXED: Changed to universally supported model
            }),
            {
                collection: collection,
                indexName: "vector_index", 
                textKey: "text",
                embeddingKey: "embedding",
            }
        );
        
        console.log("Memory System Initialized: Checkpointer & Vector Store ready.");
        return { checkpointer, vectorStore };
    } catch (error) {
        console.error("Critical Failure initializing memory:", error);
        throw error;
    }
};

const getVectorStore = () => vectorStore;

module.exports = { initializeMemory, getVectorStore };