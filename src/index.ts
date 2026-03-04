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

// 1. Help Command
bot.command("help", async (ctx) => {
    const helpText = `👋 *Salam Vinayak Singh Ji!* Main aapka Vaspbot Architect hu.

📚 *Available Commands:*
/model - Change my Brain (LLM Tier)
/metrics - View usage & health stats
/help - Show this guide

🛠️ *Tool Shortcuts (Just type like this):*
• SEARCH: [query] - To search Google
• READ: [file] - To read project files
• WRITE: [file] [content] - To update code
• GIT_PUSH: [msg] - To push to GitHub

Aap mujhse Hinglish me kuch bhi puch sakte hain Ji!`;
    await ctx.reply(helpText, { parse_mode: "Markdown" });
});

bot.command("start", async (ctx) => {
    await ctx.reply("⚡ *Vaspbot Architect Online!* Type /help to see what I can do for you, Boss!", { parse_mode: "Markdown" });
});

// 2. Model Selection UI
bot.command("model", async (ctx) => {
    const currentModel = getActiveModel();
    const modelName = currentModel?.modelName || currentModel?.model || "Unknown";

    await ctx.reply(
        `🤖 *Vaspbot Brain Settings*\n\nCurrent Model: \`${modelName}\` \n\nChoose a new brain tier:`,
        {
            parse_mode: "Markdown",
            ...Markup.inlineKeyboard([
                [Markup.button.callback("🦙 Llama 3.3 70B (Free)", "switch_llama33_free")],
                [Markup.button.callback("🌌 Grok 4.1 Fast (2M Context)", "switch_grok_fast")],
                [Markup.button.callback("🛡️ Trinity (Free)", "switch_trinity")],
                [Markup.button.callback("⚡ StepFun (Free)", "switch_stepfun")],
                [Markup.button.callback("🧠 GLM 4.5 Air (Free)", "switch_glm")],
                [Markup.button.callback("⚙️ Nemotron (Free)", "switch_nemotron")],
                [Markup.button.callback("🧩 GPT-OSS 20B (Free)", "switch_gpt_oss_free")],
                [Markup.button.callback("💎 Elite (Sonnet 3.5)", "switch_elite")],
                [Markup.button.callback("🚀 Fast (Groq 70B)", "switch_groq")],
                [Markup.button.callback("🔥 Resilient (Gemini Flash)", "switch_gemini")],
            ])
        }
    );
});

// 3. Status/Metrics Command
bot.command("metrics", async (ctx) => {
    const stats = getStats();
    const server = getServerMetrics();
    const msg = `📊 *Vaspbot Metrics*
    
🔋 *System Uptime:* ${server.uptime}
🧠 *Active Brain:* ${getActiveModel()?.modelName || "Unknown"}
💸 *Total Requests Logged:* ${stats.length || 0}
📉 *Server RAM Usage:* ${server.memory.used} / ${server.memory.total} (${server.memory.percent})

_System is healthy Ji!_`;
    await ctx.reply(msg, { parse_mode: "Markdown" });
});

// 4. Action handlers for buttons
const handleSwitch = (ctx: any, tier: string, name: string) => {
    const res = setModel(tier);
    console.log(`[System] ${res}`);
    return ctx.editMessageText(`✅ *Success!* \nVaspbot is now using the *${name}* tier.\n\nAab puchiye jo puchna hai Ji!`, {
        parse_mode: "Markdown"
    }).catch(console.error);
};

bot.action("switch_llama33_free", (ctx) => handleSwitch(ctx, "llama33_free", "Llama 3.3 Free 🦙"));
bot.action("switch_grok_fast", (ctx) => handleSwitch(ctx, "grok_fast", "Grok 4.1 Fast 🌌"));
bot.action("switch_trinity", (ctx) => handleSwitch(ctx, "trinity", "Trinity Free 🛡️"));
bot.action("switch_stepfun", (ctx) => handleSwitch(ctx, "stepfun", "StepFun Free ⚡"));
bot.action("switch_glm", (ctx) => handleSwitch(ctx, "glm", "GLM Free 🧠"));
bot.action("switch_nemotron", (ctx) => handleSwitch(ctx, "nemotron", "Nemotron Free ⚙️"));
bot.action("switch_gpt_oss_free", (ctx) => handleSwitch(ctx, "gpt_oss_free", "GPT-OSS Free 🧩"));
bot.action("switch_elite", (ctx) => handleSwitch(ctx, "elite", "Elite 💎"));
bot.action("switch_groq", (ctx) => handleSwitch(ctx, "groq", "Fast 🚀"));
bot.action("switch_gemini", (ctx) => handleSwitch(ctx, "gemini", "Resilient 🔥"));

// 5. Primary AI Message Handler
bot.on(message("text"), async (ctx) => {
    try {
        const userInput = ctx.message.text;
        if (userInput.startsWith("/")) return; // Ignore commands

        console.log(`\n[Telegram] User ID ${ctx.from.id}: ${userInput}`);

        if (!process.env.TELEGRAM_OWNER_ID) {
            console.log(`💡 [Setup] Your Chat ID is: ${ctx.from.id}`);
        }

        await ctx.sendChatAction("typing");
        let response = await executeAgentFlow(userInput);

        if (!response || response.trim() === "") {
            response = "Ji Boss, main samajh nahi paaya. Ek baar phir se bolenge?";
        }

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
        // --- 📋 Register Shortcuts for Typing Preview ---
        await bot.telegram.setMyCommands([
            { command: "help", description: "Vaspbot Guide & Command List" },
            { command: "model", description: "Switch LLM Brain Tier (Free/Fast/Elite)" },
            { command: "metrics", description: "View Server Health & Usage Stats" },
        ]);

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
