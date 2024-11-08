// src/index.ts

import * as dotenv from "dotenv";
dotenv.config();

import express, { Request, Response, NextFunction } from "express";
import path from "path";
import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { StateGraph } from "@langchain/langgraph";
import { MemorySaver, Annotation } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { movieRecommendationTool } from "./tools/movieRecommendationTool";
import rateLimit from "express-rate-limit";
import { v4 as uuidv4 } from 'uuid';
import NodeCache from "node-cache";
import cors from 'cors';

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;
// Use CORS middleware
app.use(cors({
    origin: 'http://127.0.0.1:5501', // Allow requests from this origin
    methods: ['GET', 'POST'], // Allowed HTTP methods
    allowedHeaders: ['Content-Type'], // Allowed headers
}));

// Middleware to parse JSON
app.use(express.json());

// Apply rate limiting to all requests
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
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

// Build the state graph
const workflow = new StateGraph(StateAnnotation)
    .addNode("agent", callModel)
    .addNode("tools", toolNode)
    .addEdge("__start__", "agent")
    .addConditionalEdges("agent", shouldContinue)
    .addEdge("tools", "agent");

console.log("StateGraph workflow initialized.");

// Initialize memory for state persistence
const checkpointer = new MemorySaver();

// Compile the graph into a Runnable
const appWorkflow = workflow.compile({ checkpointer });

console.log("Workflow compiled and ready.");

// Initialize cache
const cache = new NodeCache({ stdTTL: 3600 }); // Cache for 1 hour

// Endpoint to handle movie recommendation requests
app.post("/recommend", async (req: Request, res: Response):Promise<any>=>{
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
        let userMessage = new HumanMessage(`Can you recommend some ${genre} movies?`);

        // If additionalInfo is provided, append it to the message
        if (additionalInfo && typeof additionalInfo === "string") {
            userMessage = new HumanMessage(`${userMessage.content} ${additionalInfo}`);
            console.log("Additional info provided:", additionalInfo);
        }

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

// Function to run the app via console (optional)
async function runConsoleApp() {
    // Initial user message
    const userMessage = new HumanMessage("Can you recommend some science fiction movies?");

    console.log("Invoking workflow with initial message:", userMessage.content);

    // Invoke the app with the initial message
    const finalState = await appWorkflow.invoke(
        { messages: [userMessage] },
        { configurable: { thread_id: "movie_thread" } }
    );

    // Output the assistant's response
    const assistantMessage = finalState.messages[finalState.messages.length - 1];
    console.log("Assistant:", assistantMessage.content);

    // Continue the conversation (optional)
    const userFollowUp = new HumanMessage("What about comedy movies?");
    console.log("Invoking workflow with follow-up message:", userFollowUp.content);

    const nextState = await appWorkflow.invoke(
        { messages: [userFollowUp] },
        { configurable: { thread_id: "movie_thread" } }
    );

    const assistantFollowUp = nextState.messages[nextState.messages.length - 1];
    console.log("Assistant:", assistantFollowUp.content);
}

// Start the Express server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

// Optional: Run console app
// Uncomment the line below if you still want to run the console-based interactions
// runConsoleApp().catch((error) => {
//     console.error("Error running the app:", error);
// });
