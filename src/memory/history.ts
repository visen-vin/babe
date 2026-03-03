import { InMemoryChatMessageHistory } from "@langchain/core/chat_history";

// "Why": Context ke bina AI adha hai.
// "What": Ek simple class jo messages ki array ko store aur retrieve karti hai.
export const chatHistory = new InMemoryChatMessageHistory();

export async function addMessage(role: "user" | "ai", text: string) {
    if (role === "user") {
        await chatHistory.addUserMessage(text);
    } else {
        await chatHistory.addAIMessage(text);
    }
}

export async function getHistory() {
    return await chatHistory.getMessages();
}
