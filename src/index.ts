import { ChatPromptTemplate } from "@langchain/core/prompts";
import { model } from "./core/llm";
import { chatHistory } from "./memory/history";
import { tools } from "./tools";
import { AIMessage, HumanMessage, ToolMessage, SystemMessage, BaseMessage } from "@langchain/core/messages";

import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";

// "Why": Telegram bot token ko secure rakhne ke liye .env se uthate hain.
const botToken = process.env.TELEGRAM_BOT_TOKEN as string;
const bot = new Telegraf(botToken);

// "What": User input aane par runAgent ko call karna aur result send karna.
async function runAgent(userInput: string, ctx: any) {
    console.log(`\n[Telegram] User: ${userInput}`);
    const modelWithTools = model.bindTools(tools);

    const messages: BaseMessage[] = [
        new SystemMessage("You are Vaspbot, an AI Architect. Use tools if needed. Keep replies concise for Telegram."),
        new HumanMessage(userInput),
    ];

    const result = (await modelWithTools.invoke(messages)) as AIMessage;

    if (result.tool_calls && result.tool_calls.length > 0) {
        const toolCall = result.tool_calls[0]!;
        ctx.reply(`🤖 Using tool: ${toolCall.name}...`);

        const selectedTool = tools.find(t => t.name === toolCall.name);
        if (selectedTool) {
            messages.push(result); // Add the AI's tool call message
            const toolMessage = await selectedTool.invoke(toolCall);
            messages.push(toolMessage); // Add the tool's output message

            const finalResponse = await modelWithTools.invoke(messages);
            ctx.reply(finalResponse.content as string);
            await chatHistory.addAIMessage(finalResponse.content as string);
        }
    } else {
        ctx.reply(result.content as string);
        await chatHistory.addAIMessage(result.content as string);
    }
}

async function start() {
    console.log("--- ⚡ Vaspbot (Telegram Mode) Starting... ---");

    bot.on(message("text"), async (ctx) => {
        const text = ctx.message.text;
        await runAgent(text, ctx);
    });

    bot.launch();
    console.log("🚀 Vaspbot is now LIVE on Telegram!");

    // Graceful stop
    process.once("SIGINT", () => bot.stop("SIGINT"));
    process.once("SIGTERM", () => bot.stop("SIGTERM"));
}

start().catch(console.error);
