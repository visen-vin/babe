import { ChatPromptTemplate } from "@langchain/core/prompts";
import { model } from "./core/llm";
import { chatHistory } from "./memory/history";
import { tools } from "./tools";
import { AIMessage, HumanMessage, ToolMessage, SystemMessage, BaseMessage } from "@langchain/core/messages";

import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import { Hono } from "hono";

const app = new Hono();

/**
 * Core Agent Logic for both Telegram and API
 */
async function executeAgentFlow(userInput: string) {
    const modelWithTools = model.bindTools(tools);
    const messages: BaseMessage[] = [
        new SystemMessage("You are Vaspbot, an AI Architect. Respond with the final answer only."),
        new HumanMessage(userInput),
    ];

    const result = (await modelWithTools.invoke(messages)) as AIMessage;

    if (result.tool_calls && result.tool_calls.length > 0) {
        const toolCall = result.tool_calls[0]!;
        const selectedTool = tools.find(t => t.name === toolCall.name) as any;
        if (selectedTool) {
            messages.push(result);
            const toolMessage = await selectedTool.invoke(toolCall);
            messages.push(toolMessage);
            const finalResponse = await modelWithTools.invoke(messages);
            return finalResponse.content as string;
        }
    }
    return result.content as string;
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
        return c.html(await file.text());
    } catch (e) {
        return c.text("Vaspbot API is online! UI not found.");
    }
});

// --- 🤖 Telegram Bot ---
const botToken = process.env.TELEGRAM_BOT_TOKEN as string;
const bot = new Telegraf(botToken);

async function start() {
    console.log("--- ⚡ Vaspbot Starting... ---");

    // Telegram Handler
    bot.on(message("text"), async (ctx) => {
        const userInput = ctx.message.text;
        console.log(`\n[Telegram] User: ${userInput}`);

        // Simple typing notification
        await ctx.sendChatAction("typing");

        const response = await executeAgentFlow(userInput);
        await ctx.reply(response);
    });

    // Start Telegram
    bot.launch();
    console.log("🚀 Telegram Bot is LIVE!");

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
