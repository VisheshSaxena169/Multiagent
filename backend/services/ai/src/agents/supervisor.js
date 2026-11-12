
const { z } = require("zod");
const { SystemMessage } = require("@langchain/core/messages");
// Import ONLY the fast routing model
const { supervisorLLM } = require("./llm"); 

const routeSchema = z.object({
    nextAgent: z.enum(["chatAgent", "codeAgent", "pdfAgent"]).describe("The next agent to route the user's request to."),
});

const supervisorNode = async (state) => {
    // Attach structured output to the fast model
    const router = supervisorLLM.withStructuredOutput(routeSchema);
    
    const systemPrompt = new SystemMessage(
        `You are a supervisor managing a team of AI workers: 'chatAgent', 'codeAgent', and 'pdfAgent'.
        - If the user asks for code, debugging, or technical architecture, route to 'codeAgent'.
        - If the user asks about a document or PDF, route to 'pdfAgent'.
        - For all general conversation, greetings, and queries, route to 'chatAgent'.
        Analyze the conversation and determine which worker should respond next.`
    );

    const messages = [systemPrompt, ...state.messages];
    
    console.time("[TIMER] Supervisor Routing");
    const decision = await router.invoke(messages);
    console.timeEnd("[TIMER] Supervisor Routing");

    return { nextAgent: decision.nextAgent };
};

module.exports = { supervisorNode };