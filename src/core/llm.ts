import { ChatOpenAI } from "@langchain/openai";

// "Why": ChatOpenAI bridge is often more stable for tool calls on Groq.
export const model = new ChatOpenAI({
    apiKey: process.env.GROQ_API_KEY as string,
    configuration: {
        baseURL: "https://api.groq.com/openai/v1",
    },
    modelName: "llama-3.3-70b-versatile",
});
