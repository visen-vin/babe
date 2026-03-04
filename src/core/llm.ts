import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

// Primary: Groq Llama 3
export const model = new ChatOpenAI({
    apiKey: process.env.GROQ_API_KEY as string,
    configuration: {
        baseURL: "https://api.groq.com/openai/v1",
    },
    modelName: "llama-3.3-70b-versatile",
});

// Fallback: Gemini 1.5 Flash (Huge context, higher limits)
export const fallbackModel = new ChatGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_API_KEY as string,
    model: "gemini-1.5-flash",
});
