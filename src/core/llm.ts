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

// Fallback: Gemini Pro (More compatible generally)
export const fallbackModel = new ChatGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_API_KEY as string,
    model: "gemini-pro",
});

// Tertiary: OpenRouter (Unified API for everything)
export const openRouterModel = new ChatOpenAI({
    apiKey: process.env.OPENROUTER_API_KEY as string,
    configuration: {
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: {
            "HTTP-Referer": "https://github.com/visen-vin/babe",
            "X-Title": "Vaspbot Architect",
        },
    },
    modelName: "openai/gpt-3.5-turbo", // Budget friendly tertiary fallback
});
