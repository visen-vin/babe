import { getActiveModel, setModel } from "./core/llm";
import { chatHistory } from "./memory/history";
import { tools, webSearchTool, fileReaderTool, fileWriterTool } from "./tools/index";
import { AIMessage, HumanMessage, ToolMessage, SystemMessage, BaseMessage } from "@langchain/core/messages";
import { Telegraf, Markup } from "telegraf";
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
        if (!exists) return c.text("UI file not found in public/index.html");
        const content = await file.text();
        return c.html(content);
    } catch (e: any) {
        return c.text("Vaspbot API is online! UI error.");
    }
});

// --- 🤖 Telegram Bot Configuration ---
const botToken = process.env.TELEGRAM_BOT_TOKEN as string;
const bot = new Telegraf(botToken);

// --- 🛠️ Bot Command & Action Handlers ---

// 1. Model Selection UI
bot.command("model", async (ctx) => {
    const currentModel = getActiveModel();
    const modelName = currentModel?.modelName || currentModel?.model || "Unknown";

    await ctx.reply(
        `🤖 *Vaspbot Brain Settings*\n\nCurrent Model: \`${modelName}\` \n\nChoose a new brain tier:`,
        {
            parse_mode: "Markdown",
            ...Markup.inlineKeyboard([
                [Markup.button.callback("🛡️ Trinity (Free)", "switch_trinity")],
                [Markup.button.callback("⚡ StepFun (Free)", "switch_stepfun")],
                [Markup.button.callback("🧠 GLM 4.5 Air (Free)", "switch_glm")],
                [Markup.button.callback("⚙️ Nemotron (Free)", "switch_nemotron")],
                [Markup.button.callback("💎 Elite (Sonnet 3.5)", "switch_elite")],
                [Markup.button.callback("🚀 Fast (Groq 70B)", "switch_groq")],
                [Markup.button.callback("🔥 Resilient (Gemini Flash)", "switch_gemini")],
            ])
        }
    );
});

// 2. Action handlers for buttons
const handleSwitch = (ctx: any, tier: string, name: string) => {
    const res = setModel(tier);
    console.log(`[System] ${res}`);
    return ctx.editMessageText(`✅ *Success!* \nVaspbot is now using the *${name}* tier.\n\nAab puchiye jo puchna hai Ji!`, {
        parse_mode: "Markdown"
    }).catch(console.error);
};

bot.action("switch_trinity", (ctx) => handleSwitch(ctx, "trinity", "Trinity Free 🛡️"));
bot.action("switch_stepfun", (ctx) => handleSwitch(ctx, "stepfun", "StepFun Free ⚡"));
bot.action("switch_glm", (ctx) => handleSwitch(ctx, "glm", "GLM Free 🧠"));
bot.action("switch_nemotron", (ctx) => handleSwitch(ctx, "nemotron", "Nemotron Free ⚙️"));
bot.action("switch_elite", (ctx) => handleSwitch(ctx, "elite", "Elite 💎"));
bot.action("switch_groq", (ctx) => handleSwitch(ctx, "groq", "Fast 🚀"));
bot.action("switch_gemini", (ctx) => handleSwitch(ctx, "gemini", "Resilient 🔥"));

// 3. Primary AI Message Handler
bot.on(message("text"), async (ctx) => {
    try {
        const userInput = ctx.message.text;
        if (userInput.startsWith("/")) return; // Ignore commands

        console.log(`\n[Telegram] User ID ${ctx.from.id}: ${userInput}`);

        if (!process.env.TELEGRAM_OWNER_ID) {
            console.log(`💡 [Setup] Your Chat ID is: ${ctx.from.id}`);
        }

        await ctx.sendChatAction("typing");
        const response = await executeAgentFlow(userInput);
        await ctx.reply(response);
    } catch (err: any) {
        console.error("Telegram Handler Error:", err.message);
        await ctx.reply("😔 I'm having trouble responding right now. Please try again later.");
    }
});

// --- 🚀 Startup & Server Launch ---
async function start() {
    console.log("--- ⚡ Vaspbot Starting... ---");

    startAutonomousResearch();
    startMemoryReflection();
    setInterval(() => checkSystemHealth(bot), 5 * 60 * 1000);

    try {
        // Need to catch errors during launch properly
        await bot.launch();
        console.log("🚀 Telegram Bot is LIVE!");
    } catch (e: any) {
        console.error("❌ Failed to initiate Telegram bot:", e.message);
    }

    // Start Web Server using Bun.serve
    console.log("🌐 Web API is LIVE on port 3001!");
    (globalThis as any).Bun.serve({
        fetch: app.fetch,
        port: 3001,
    });

    // Graceful stop
    process.once("SIGINT", () => bot.stop("SIGINT"));
    process.once("SIGTERM", () => bot.stop("SIGTERM"));
}

start().catch(console.error);
export { bot };
