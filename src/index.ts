// src/index.ts

import * as dotenv from "dotenv";
dotenv.config();

import express, { Request, Response, NextFunction } from "express";
import path from "path";
import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages";
import { ChatOpenAI, OpenAI } from "@langchain/openai";
import { StateGraph } from "@langchain/langgraph";
import { MemorySaver, Annotation } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { movieRecommendationTool } from "./tools/movieRecommendationTool";
import rateLimit from "express-rate-limit";
import { v4 as uuidv4 } from 'uuid';
import NodeCache from "node-cache";
import cors from 'cors';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
    origin: 'http://127.0.0.1:5501',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
}));

app.use(express.json());

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: "Too many requests from this IP, please try again later.",
});
app.use(limiter);

// Serve static files (for chat interface)
app.use(express.static(path.join(__dirname, "../public")));

// Define the state annotation
const StateAnnotation = Annotation.Root({
    messages: Annotation<AIMessage[]>({
        reducer: (prev, next) => prev.concat(next),
    }),
});

// Define the tools and tool node
const tools = [movieRecommendationTool];
const toolNode = new ToolNode(tools);

// Initialize the OpenAI model and bind tools
const model = new ChatOpenAI({
    modelName: "gpt-3.5-turbo",
    temperature: 0.7,
}).bindTools(tools);

console.log("OpenAI model initialized with modelName: gpt-3.5-turbo");

// Function to determine the next step based on the state
function shouldContinue(state: any) {
    const messages = state.messages;
    const lastMessage = messages[messages.length - 1];

    // Log the last message
    console.log("Last Message:", lastMessage);

    // Check if the AI wants to call a tool
    if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
        console.log("AI intends to call a tool.");
        return "tools";
    }

    // Check if the last message is from the fallback node
    if (lastMessage.name === "fallback") {
        console.log("AI ends the conversation after fallback.");
        return "__end__";
    }

    // Otherwise, end the conversation
    console.log("AI ends the conversation.");
    return "__end__";
}

// Function to call the model
async function callModel(state: any) {
    const messages = state.messages;
    console.log("Invoking model with messages:", messages);

    const response = await model.invoke(messages);

    console.log("Model response:", response);
    return { messages: [response] };
}

// Function to handle fallback responses
async function fallbackResponse(state: any) {
    const messages = state.messages;
    const lastMessage = messages[messages.length - 1];

    // Extract user query for context
    const userQuery = messages.find((msg: BaseMessage) => msg instanceof HumanMessage)?.content || "Provide some movie recommendations.";

    // Initialize a separate OpenAI instance for fallback
    const fallbackModelInstance = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        modelName: "gpt-3.5-turbo",
        temperature: 0.7,
    });

    // Construct the fallback prompt
    const prompt = `The user asked: "${userQuery}". However, I couldn't find any matching movies based on their criteria. Please provide a friendly and engaging response to the user, suggesting alternative genres, asking for more specific preferences, or offering general movie recommendations.`;

    // Generate the fallback response
    let fallbackMsgContent: string;
    try {
        fallbackMsgContent = await fallbackModelInstance.call(prompt);
    } catch (error) {
        console.error("Error generating fallback response:", error);
        fallbackMsgContent = "I'm sorry, I couldn't find any movies matching your criteria, and I'm unable to provide alternative suggestions at the moment. Please try a different query.";
    }

    // Create an AIMessage with the fallback response
    const fallbackMsg = new AIMessage(fallbackMsgContent, { name: "fallback" });

    console.log("Fallback Assistant Response:", fallbackMsgContent);

    return { messages: [fallbackMsg] };
}

// Build the state graph
const workflow = new StateGraph(StateAnnotation)
    .addNode("agent", callModel)
    .addNode("tools", toolNode)
    .addNode("fallback", fallbackResponse) // Add fallback node
    .addEdge("__start__", "agent")
    .addConditionalEdges("agent", shouldContinue)
    .addConditionalEdges("tools", (state: any) => {
        const lastMessage = state.messages[state.messages.length - 1];
        if (lastMessage.content === null || lastMessage.content.trim() === "" || lastMessage.content.includes("No movies found")) {
            console.log("No movies found. Switching to fallback.");
            return "fallback";
        }
        return "agent";
    });

console.log("StateGraph workflow initialized.");

// Initialize memory for state persistence
const checkpointer = new MemorySaver();

// Compile the graph into a Runnable
const appWorkflow = workflow.compile({ checkpointer });

console.log("Workflow compiled and ready.");

// Initialize cache
const cache = new NodeCache({ stdTTL: 3600 }); // Cache for 1 hour

// Endpoint to handle movie recommendation requests
app.post("/recommend", async (req: Request, res: Response): Promise<any> => {
    const { genre, additionalInfo, thread_id } = req.body;

    console.log("Received /recommend request with body:", req.body);

    if (!genre || typeof genre !== "string") {
        console.log("Invalid genre provided.");
        return res.status(400).json({ error: "Please provide a valid 'genre' in the request body." });
    }

    try {
        // Generate a new thread_id if not provided
        const currentThreadId = thread_id || uuidv4();

        console.log(`Using thread_id: ${currentThreadId}`);

        // Create a HumanMessage with the genre
        let userMessageContent = `Can you recommend some ${genre} movies?`;

        // If additionalInfo is provided, append it to the message
        if (additionalInfo && typeof additionalInfo === "string") {
            userMessageContent += ` ${additionalInfo}`;
            console.log("Additional info provided:", additionalInfo);
        }

        const userMessage = new HumanMessage(userMessageContent);

        console.log("Constructed User Message:", userMessage.content);

        // Invoke the workflow with the user message
        const finalState = await appWorkflow.invoke(
            { messages: [userMessage] },
            { configurable: { thread_id: currentThreadId } }
        );

        console.log("Final State after workflow invocation:", finalState);

        // Extract the assistant's response
        const assistantMessage = finalState.messages[finalState.messages.length - 1];
        console.log(`Assistant: ${assistantMessage.content}`);

        // Send the response back to the client, including thread_id
        res.json({ thread_id: currentThreadId, recommendations: assistantMessage.content });
    } catch (error: any) {
        console.error("Error processing recommendation:", error);
        res.status(500).json({ error: "An error occurred while processing your request." });
    }
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error("Unhandled Error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
});

// Start the Express server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
