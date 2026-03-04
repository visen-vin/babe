import { SqliteChatMessageHistory } from "./sqlite_history";

// "Why": Context ke bina AI adha hai. Persistent memory ensures history survives restarts.
// "What": Wraps SQLite history for easy use in the agent flow.

// Default history instance
export const chatHistory = new SqliteChatMessageHistory("default");

export async function addMessage(role: "user" | "ai", text: string, sessionId: string = "default") {
    const history = new SqliteChatMessageHistory(sessionId);
    if (role === "user") {
        await history.addUserMessage(text);
    } else {
        await history.addAIMessage(text);
    }
}

export async function getHistory(sessionId: string = "default") {
    const history = new SqliteChatMessageHistory(sessionId);
    return await history.getMessages();
}

export function getSessionHistory(sessionId: string) {
    return new SqliteChatMessageHistory(sessionId);
}
