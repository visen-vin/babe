import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { logUsage } from "./usage";
import { AIMessage } from "@langchain/core/messages";

// Helper to create OpenRouter model
const createOpenRouterModel = (modelName: string, title: string) => new ChatOpenAI({
    apiKey: process.env.OPENROUTER_API_KEY as string,
    configuration: {
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: {
            "HTTP-Referer": "https://github.com/visen-vin/babe",
            "X-Title": title
        },
    },
    modelName: modelName,
});

// --- 💎 TIER 1: Elite Models ---
export const eliteModel = createOpenRouterModel("anthropic/claude-3.5-sonnet", "Vaspbot Elite");

// --- 🎖️ TIER 1.5: Low-End Premium (Long Context) ---
export const grokFastModel = createOpenRouterModel("x-ai/grok-4.1-fast", "Vaspbot Groq Fast");

// --- 🆓 FREE PRIMARY MODELS (As requested by Boss) ---
export const llama33Free = createOpenRouterModel("meta-llama/llama-3.3-70b-instruct:free", "Vaspbot Llama 3.3 Free");
export const trinityModel = createOpenRouterModel("arcee-ai/trinity-large-preview:free", "Vaspbot Trinity Free");
export const stepfunModel = createOpenRouterModel("stepfun/step-3.5-flash:free", "Vaspbot StepFun Free");
export const glmModel = createOpenRouterModel("z-ai/glm-4.5-air:free", "Vaspbot GLM Free");
export const nemotronModel = createOpenRouterModel("nvidia/nemotron-3-nano-30b-a3b:free", "Vaspbot Nemotron Free");
export const gptOssFree = createOpenRouterModel("openai/gpt-oss-20b:free", "Vaspbot GPT-OSS Free");

// --- 🚀 TIER 2: Fast Paid (Groq/OpenRouter) ---
export const groqModel = new ChatOpenAI({
    apiKey: process.env.GROQ_API_KEY as string,
    configuration: { baseURL: "https://api.groq.com/openai/v1" },
    modelName: "llama-3.3-70b-versatile",
});

// --- 🔥 TIER 3: Resilient (Gemini) ---
export const geminiModel = new ChatGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_API_KEY as string,
    model: "gemini-1.5-flash",
});

// Model Registry
const models: Record<string, any> = {
    elite: eliteModel,
    grok_fast: grokFastModel,
    trinity: trinityModel,
    stepfun: stepfunModel,
    glm: glmModel,
    nemotron: nemotronModel,
    llama33_free: llama33Free,
    gpt_oss_free: gptOssFree,
    groq: groqModel,
    gemini: geminiModel,
};

let activeTier = "trinity";

export const getActiveModel = () => models[activeTier] || llama33Free;

export function setModel(tier: string) {
    if (models[tier]) {
        activeTier = tier;
        return `Model switched to ${tier} tier.`;
    }
    return `Model tier ${tier} not found.`;
}

export async function invokeWithLog(model: any, messages: any, modelName: string): Promise<AIMessage> {
    const result = (await model.invoke(messages)) as AIMessage;
    const usage = (result as any).usage_metadata || (result as any).additional_kwargs?.tokenUsage;

    if (usage) {
        const inputTokens = usage.input_tokens || usage.prompt_tokens || 0;
        const outputTokens = usage.output_tokens || usage.completion_tokens || 0;
        logUsage(modelName, inputTokens, outputTokens);
    }

    return result;
}
