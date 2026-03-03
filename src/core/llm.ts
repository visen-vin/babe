import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

// "Why": Switching to Gemini as it's more stable for tool calling.
export const model = new ChatGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_API_KEY as string,
    model: "gemini-1.5-flash",
});
