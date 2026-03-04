import { getActiveModel } from "./core/llm";
import { chatHistory } from "./memory/history";
import { tools, webSearchTool, fileReaderTool, fileWriterTool } from "./tools/index";
import { AIMessage, HumanMessage, ToolMessage, SystemMessage, BaseMessage } from "@langchain/core/messages";

import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import { Hono } from "hono";

import { executeAgentFlow } from "./core/agent";
import { startAutonomousResearch } from "./autonomous";
import { startMemoryReflection } from "./reflection";
import { getStats, getServerMetrics } from "./core/usage";
import { checkSystemHealth } from "./core/alerts";

const app = new Hono();

// --- 🌐 API Definitions ---
app.post("/chat", async (c) => {
    const body = await c.req.json();
    const userInput = body.message;
    console.log(`\n[API] Request: ${userInput}`);
    const response = await executeAgentFlow(userInput);
    return c.json({ response });
});

app.get("/metrics", async (c) => {
    return c.json({
        usage: getStats(),
        server: getServerMetrics()
    });
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
export const bot = new Telegraf(botToken);

async function start() {
    console.log("--- ⚡ Vaspbot Starting... ---");

    // Start background research loop
    startAutonomousResearch();

    // Start autonomous memory reflection
    startMemoryReflection();

    // Start proactive health check every 5 minutes
    setInterval(() => checkSystemHealth(bot), 5 * 60 * 1000);

    // Telegram Handler
    bot.on(message("text"), async (ctx) => {
        try {
            const userInput = ctx.message.text;
            console.log(`\n[Telegram] User ID ${ctx.from.id}: ${userInput}`);

            // To set owner ID automatically if not present in .env
            if (!process.env.TELEGRAM_OWNER_ID) {
                console.log(`💡 [Setup] Your Telegram Chat ID is: ${ctx.from.id}. Please add TELEGRAM_OWNER_ID=${ctx.from.id} to your .env file.`);
            }

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
    // Start Telegram (Wrapped in try-catch to prevent crash if conflict occurs)
    try {
        bot.launch().catch(err => {
            console.error("⚠️ Telegram Bot launch error:", err.message);
        });
        console.log("🚀 Telegram Bot attempt started!");
    } catch (e: any) {
        console.error("❌ Failed to initiate Telegram bot launch:", e.message);
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
