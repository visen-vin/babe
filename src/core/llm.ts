import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

// Tier 1: The "Elite" Brain (OpenRouter)
export const eliteModel = new ChatOpenAI({
    apiKey: process.env.OPENROUTER_API_KEY as string,
    configuration: {
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: { "HTTP-Referer": "https://github.com/visen-vin/babe", "X-Title": "Vaspbot Elite" },
    },
    modelName: "anthropic/claude-3.5-sonnet",
});

// Tier 2: The "Fast" Brain (Groq)
export const groqModel = new ChatOpenAI({
    apiKey: process.env.GROQ_API_KEY as string,
    configuration: { baseURL: "https://api.groq.com/openai/v1" },
    modelName: "llama-3.3-70b-versatile",
});

// Tier 3: The "Resilient" Brain (Gemini)
export const geminiModel = new ChatGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_API_KEY as string,
    model: "gemini-1.5-flash",
});

// Tier 4: The "Safe/Free" Brain (OpenRouter Free Models)
export const freeModel = new ChatOpenAI({
    apiKey: process.env.OPENROUTER_API_KEY as string,
    configuration: {
        baseURL: "https://openrouter.ai/api/v1",
    },
    modelName: "meta-llama/llama-3-8b-instruct:free",
});

// Implementation of dynamic switching
let activeModel: any = groqModel;

export const getActiveModel = () => activeModel;

export function setModel(tier: "elite" | "groq" | "gemini" | "free") {
    if (tier === "elite") activeModel = eliteModel;
    else if (tier === "groq") activeModel = groqModel;
    else if (tier === "gemini") activeModel = geminiModel;
    else if (tier === "free") activeModel = freeModel;
    return `Model switched to ${tier} tier.`;
}
