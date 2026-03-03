import { ChatPromptTemplate } from "@langchain/core/prompts";
import { model } from "./core/llm";
import { chatHistory } from "./memory/history";
import { tools, webSearchTool, fileReaderTool } from "./tools/index";
import { AIMessage, HumanMessage, ToolMessage, SystemMessage, BaseMessage } from "@langchain/core/messages";

import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import { Hono } from "hono";

const app = new Hono();

/**
 * Core Agent Logic for both Telegram and API
 */
async function executeAgentFlow(userInput: string) {
    try {
        console.log(`[Brain] Query: ${userInput}`);

        const systemPrompt = `You are Vaspbot, a professional AI Architect.
        MANDATORY FORMAT: 
        - If you need to search: SEARCH: [query]
        - If you need to read: READ: [filename]
        - If you have the answer: ANSWER: [final response]
        Only use tools if necessary.`;

        const messages: BaseMessage[] = [
            new SystemMessage(systemPrompt),
            new HumanMessage(userInput),
        ];

        let steps = 0;
        let finalContent = "";

        while (steps < 3) {
            const result = (await model.invoke(messages)) as AIMessage;
            const content = result.content as string;
            finalContent = content;

            if (content.includes("SEARCH:")) {
                const query = content.split("SEARCH:")[1]?.trim();
                console.log(`[Manual Tool] Searching for: ${query}`);
                const searchResult = await (webSearchTool as any).invoke({ query });
                messages.push(new AIMessage(content));
                messages.push(new HumanMessage(`Search Results: ${searchResult}`));
            } else if (content.includes("READ:")) {
                const filename = content.split("READ:")[1]?.trim();
                console.log(`[Manual Tool] Reading file: ${filename}`);
                const fileContent = await (fileReaderTool as any).invoke({ fileName: filename });
                messages.push(new AIMessage(content));
                messages.push(new HumanMessage(`File Content: ${fileContent}`));
            } else if (content.includes("ANSWER:")) {
                return content.replace("ANSWER:", "").trim();
            } else {
                // If it doesn't follow the format but gives an answer
                return content.trim();
            }
            steps++;
        }

        return finalContent.replace("SEARCH:", "Search:").replace("ANSWER:", "").trim();
    } catch (err: any) {
        console.error("Brain Error:", err.message);
        return "⚠️ Architect Brain Glitch: " + err.message;
    }
}

// --- 🌐 API Definitions ---
app.post("/chat", async (c) => {
    const body = await c.req.json();
    const userInput = body.message;
    console.log(`\n[API] Request: ${userInput}`);
    const response = await executeAgentFlow(userInput);
    return c.json({ response });
});

app.get("/", async (c) => {
    try {
        const filePath = "./public/index.html";
        const file = (globalThis as any).Bun.file(filePath);
        const exists = await file.exists();
        console.log(`[API] Serving UI from ${filePath} (Exists: ${exists})`);

        if (!exists) return c.text("UI file not found in public/index.html");

        const content = await file.text();
        return c.html(content);
    } catch (e: any) {
        console.error(`[API] UI Error: ${e.message}`);
        return c.text("Vaspbot API is online! UI error.");
    }
});

// --- 🤖 Telegram Bot ---
const botToken = process.env.TELEGRAM_BOT_TOKEN as string;
const bot = new Telegraf(botToken);

async function start() {
    console.log("--- ⚡ Vaspbot Starting... ---");

    // Telegram Handler
    bot.on(message("text"), async (ctx) => {
        try {
            const userInput = ctx.message.text;
            console.log(`\n[Telegram] User: ${userInput}`);

            // Simple typing notification
            await ctx.sendChatAction("typing");

            const response = await executeAgentFlow(userInput);
            console.log(`[Telegram] Bot response sent: ${response.substring(0, 50)}...`);
            await ctx.reply(response);
        } catch (err: any) {
            console.error("Telegram Handler Error:", err.message);
            await ctx.reply("😔 I'm having trouble responding right now. Please try again later.");
        }
    });

    // Start Telegram (Wrapped in try-catch to prevent crash if conflict occurs)
    try {
        bot.launch().catch(err => {
            console.error("⚠️ Telegram Bot error (Token conflict?):", err.message);
        });
        console.log("🚀 Telegram Bot attempt started!");
    } catch (e: any) {
        console.error("❌ Failed to launch Telegram bot:", e.message);
    }

    // Start Web Server using Bun.serve
    console.log("🌐 Web API is LIVE on port 3001!");

    // Explicitly using Bun global
    (globalThis as any).Bun.serve({
        fetch: app.fetch,
        port: 3001,
    });

    // Graceful stop
    process.once("SIGINT", () => bot.stop("SIGINT"));
    process.once("SIGTERM", () => bot.stop("SIGTERM"));
}

start().catch(console.error);
