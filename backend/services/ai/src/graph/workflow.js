// // backend/services/ai/src/graph/workflow.js
// const { StateGraph, START, END, Annotation } = require("@langchain/langgraph");
// const { initializeMemory } = require("./memory");
// const { supervisorNode } = require("../agents/supervisor");
// const { chatAgentNode, codeAgentNode } = require("../agents/workers");

// const GraphState = Annotation.Root({
//     messages: Annotation({
//         reducer: (currentState, incomingState) => currentState.concat(incomingState),
//         default: () => [],
//     }),
//     nextAgent: Annotation({
//         reducer: (currentState, incomingState) => incomingState,
//         default: () => "chatAgent",
//     })
// });

// const buildWorkflow = async () => {
//     const checkpointer = await initializeMemory();

//     const workflow = new StateGraph(GraphState)
//         .addNode("supervisor", supervisorNode)
//         .addNode("chatAgent", chatAgentNode)
//         .addNode("codeAgent", codeAgentNode)
//         .addEdge(START, "supervisor")
//         .addConditionalEdges("supervisor", (state) => state.nextAgent, {
//             chatAgent: "chatAgent",
//             codeAgent: "codeAgent",
//             pdfAgent: "chatAgent" // Fallback to chatAgent until pdfAgent is built
//         })
//         .addEdge("chatAgent", END)
//         .addEdge("codeAgent", END);

//     return workflow.compile({ checkpointer });
// };

// module.exports = { buildWorkflow };




const { StateGraph, START, END, Annotation, messagesStateReducer } = require("@langchain/langgraph");
const { initializeMemory } = require("./memory");
const { supervisorNode } = require("../agents/supervisor");
const { chatAgentNode, codeAgentNode, pdfAgentNode } = require("../agents/workers");

// Import the new RAG and pruning nodes you created
const { injectPastContext, pruneMemory } = require("./memoryManager");

const GraphState = Annotation.Root({
    messages: Annotation({
        // CRITICAL FIX: You must use the built-in reducer so LangGraph 
        // can process the RemoveMessage commands emitted by pruneMemory.
        reducer: messagesStateReducer,
        default: () => [],
    }),
    nextAgent: Annotation({
        reducer: (currentState, incomingState) => incomingState,
        default: () => "chatAgent",
    }),
    // ADDED: A flag to tell the graph to skip the LLM router
    skipSupervisor: Annotation({
        reducer: (currentState, incomingState) => incomingState !== undefined ? incomingState : currentState,
        default: () => false,
    })
});

const buildWorkflow = async () => {
    // Destructure checkpointer from the updated memory.js setup
    const { checkpointer } = await initializeMemory();

    const workflow = new StateGraph(GraphState)
        // 1. Register all nodes
        .addNode("retrieve_context", injectPastContext)
        .addNode("supervisor", supervisorNode)
        .addNode("chatAgent", chatAgentNode)
        .addNode("codeAgent", codeAgentNode)
        .addNode("pdfAgent", pdfAgentNode) // ADDED
        .addNode("prune_memory", pruneMemory)
        
        // 2. Execution Flow Starts: Inject older context from Vector DB
        .addEdge(START, "retrieve_context")
        
        // 3. Pass context and user prompt to the Supervisor
        .addConditionalEdges("retrieve_context", (state) => {
            return state.skipSupervisor ? state.nextAgent : "supervisor";
        }, {
            chatAgent: "chatAgent",
            codeAgent: "codeAgent",
            pdfAgent: "pdfAgent", // FIXED // Fallback until pdfAgent is built
            supervisor: "supervisor"
        })
        
        // 4. Supervisor routes to the appropriate worker agent
        .addConditionalEdges("supervisor", (state) => state.nextAgent, {
            chatAgent: "chatAgent",
            codeAgent: "codeAgent",
            pdfAgent: "pdfAgent" // Fallback
        })
        
        // 5. Workers finish their task and route to the Memory Pruner
        .addEdge("chatAgent", "prune_memory")
        .addEdge("codeAgent", "prune_memory")
        .addEdge("pdfAgent", "prune_memory") // ADDED
        
        // 6. Pruner archives overflow messages and ends the cycle
        .addEdge("prune_memory", END);

    return workflow.compile({ checkpointer });
};

module.exports = { buildWorkflow };