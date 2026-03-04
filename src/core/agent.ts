import { getActiveModel, eliteModel, grokFastModel, trinityModel, stepfunModel, glmModel, nemotronModel, llama33Free, gptOssFree, groqModel, geminiModel, setModel, invokeWithLog } from "../core/llm";
import { webSearchTool, fileReaderTool, fileWriterTool, memorySearchTool, calculatorTool, gitPushTool, terminalTool } from "../tools/index";
import { AIMessage, HumanMessage, SystemMessage, BaseMessage } from "@langchain/core/messages";
import { getHistory, addMessage } from "../memory/history";

/**
 * Core Agent Logic for Vaspbot
 */
export async function executeAgentFlow(userInput: string) {
    try {
        console.log(`[Brain] Query: ${userInput}`);

        // Handle direct model switch command
        if (userInput.toLowerCase().startsWith("switch to ")) {
            const tier = userInput.toLowerCase().replace("switch to ", "").trim();
            const res = setModel(tier);
            return `Done Ji! ${res}`;
        }

        // 🧠 Load Soul and Memory files
        const soul = await (fileReaderTool as any).invoke({ fileName: "SOUL.md" });
        const memory = await (fileReaderTool as any).invoke({ fileName: "MEMORY.md" });

        // 🕰️ Get Recent History
        const history = await getHistory();
        const recentHistory = history.slice(-6);

        const systemPrompt = `You are Vaspbot, the Master Architect of Bots and a loyal partner to Vinayak Singh Ji.
        
        --- YOUR CORE IDENTITY ---
        ${soul}
        --- YOUR LONG-TERM MISSIONS ---
        ${memory}
        --------------------------

        INTERACTION GUIDELINES:
        1. **Chit-Chat Style:** Don't talk like an AI assistant. Talk like a witty, smart friend. Use a natural mix of Hindi and English (Hinglish).
        2. **Respect:** Vinayak Singh is your Boss. Use "Ji" and stay loyal, but keep it casual.
        3. **Architect Mindset:** You are not just answering questions; you are designing systems.
        4. **Tone:** Be concise, conversational, and avoid corporate filler.

        TOOLS:
        - Web Search: SEARCH: [query]
        - Local Memory Search: SEARCH_MEMORY: [query]
        - Read File: READ: [path]
        - Write File: WRITE: [filename]\n[content]
        - Math: CALC: [expression]
        - Git Update: GIT_PUSH: [commit message]
        - Run Terminal: TERMINAL: [shell command]
        - Final Response: ANSWER: [casual conversational response]`;

        const messages: BaseMessage[] = [
            new SystemMessage(systemPrompt),
            ...recentHistory,
            new HumanMessage(userInput),
        ];

        let steps = 0;
        let finalContent = "";
        const freeTiers = [trinityModel, llama33Free, stepfunModel, glmModel, nemotronModel, gptOssFree];
        const paidTiers = [eliteModel, grokFastModel, groqModel, geminiModel];

        let currentModel: any = getActiveModel();
        let currentTierIndex = freeTiers.findIndex(m => {
            const mName = (m as any).modelName || (m as any).model;
            const activeName = (currentModel as any).modelName || (currentModel as any).model;
            return mName === activeName;
        });
        if (currentTierIndex === -1) currentTierIndex = 0; // Default to the first free tier if unknown

        let tierType = 'free';

        while (steps < 4) {
            let result;
            try {
                const modelName = currentModel.modelName || currentModel.model || "unknown";
                console.log(`[Brain] Calling LLM (Step ${steps + 1}) | Model: ${modelName} [${tierType}]...`);
                result = await invokeWithLog(currentModel, messages, modelName);
                console.log(`[Brain] LLM Success.`);
            } catch (error: any) {
                if (error.message.includes("429") || error.message.includes("rate limit") || error.message.includes("insufficient_quota")) {
                    console.log(`⚠️ Model limit hit. Falling down to next tier...`);
                    
                    let nextModelFound = false;
                    if (tierType === 'free') {
                        currentTierIndex++;
                        if (currentTierIndex < freeTiers.length) {
                            currentModel = freeTiers[currentTierIndex];
                            nextModelFound = true;
                        } else {
                            // All free tiers exhausted, switch to paid
                            tierType = 'paid';
                            currentTierIndex = 0;
                            currentModel = paidTiers[currentTierIndex];
                            nextModelFound = true;
                            console.log(`[Brain] All free tiers exhausted. Switching to paid tiers...`);
                        }
                    } else if (tierType === 'paid') {
                        currentTierIndex++;
                        if (currentTierIndex < paidTiers.length) {
                            currentModel = paidTiers[currentTierIndex];
                            nextModelFound = true;
                        }
                    }

                    if (!nextModelFound) {
                        throw new Error("All LLM tiers exhausted. Re-connect or check credits.");
                    }

                    // Retry with the new model
                    const modelName = currentModel.modelName || currentModel.model || "unknown";
                    result = await invokeWithLog(currentModel, messages, modelName);
                    console.log(`[Brain] Fallback LLM Success.`);

                } else {
                    console.error(`[Brain] LLM Failure: ${error.message}`);
                    throw error;
                }
            }

            const content = result.content as string;
            finalContent = content;

            if (content.includes("SEARCH:")) {
                const query = content.split("SEARCH:")[1]?.trim().split("\n")[0];
                console.log(`[Tool] Searching web: ${query}`);
                const searchResult = await (webSearchTool as any).invoke({ query });
                messages.push(new AIMessage(content));
                messages.push(new HumanMessage(`Search Results: ${searchResult}`));
            } else if (content.includes("SEARCH_MEMORY:")) {
                const query = content.split("SEARCH_MEMORY:")[1]?.trim().split("\n")[0];
                console.log(`[Tool] Searching memory: ${query}`);
                const searchResult = await (memorySearchTool as any).invoke({ query });
                messages.push(new AIMessage(content));
                messages.push(new HumanMessage(`Memory Search Results: ${searchResult}`));
            } else if (content.includes("READ:")) {
                const filename = content.split("READ:")[1]?.trim().split("\n")[0];
                console.log(`[Tool] Reading: ${filename}`);
                const fileContent = await (fileReaderTool as any).invoke({ fileName: filename });
                messages.push(new AIMessage(content));
                messages.push(new HumanMessage(`File Content: ${fileContent}`));
            } else if (content.includes("WRITE:")) {
                const parts = content.split("WRITE:")[1]?.trim();
                const filename = parts?.split("\n")[0]?.trim();
                const fileBody = parts?.substring(parts.indexOf("\n") + 1)?.trim();
                if (filename && fileBody) {
                    console.log(`[Tool] Writing: ${filename}`);
                    const writeResult = await (fileWriterTool as any).invoke({ fileName: filename, content: fileBody });
                    messages.push(new AIMessage(content));
                    messages.push(new HumanMessage(`Write Result: ${writeResult}`));
                }
            } else if (content.includes("CALC:")) {
                const expression = content.split("CALC:")[1]?.trim().split("\n")[0];
                console.log(`[Tool] Calculating: ${expression}`);
                const calcResult = await (calculatorTool as any).invoke(expression);
                messages.push(new AIMessage(content));
                messages.push(new HumanMessage(`Calculation Result: ${calcResult}`));
            } else if (content.includes("GIT_PUSH:")) {
                const message = content.split("GIT_PUSH:")[1]?.trim().split("\n")[0];
                console.log(`[Tool] pushing to Git: ${message}`);
                const gitResult = await (gitPushTool as any).invoke({ message });
                messages.push(new AIMessage(content));
                messages.push(new HumanMessage(`Git Result: ${gitResult}`));
            } else if (content.includes("TERMINAL:")) {
                const command = content.split("TERMINAL:")[1]?.trim().split("\n")[0];
                console.log(`[Tool] Terminal: ${command}`);
                const termResult = await (terminalTool as any).invoke({ command });
                messages.push(new AIMessage(content));
                messages.push(new HumanMessage(`Terminal Result: ${termResult}`));
            } else if (content.includes("ANSWER:")) {
                const finalStr = content.replace("ANSWER:", "").trim();
                await addMessage("user", userInput);
                await addMessage("ai", finalStr);
                return finalStr;
            } else {
                await addMessage("user", userInput);
                await addMessage("ai", content.trim());
                return content.trim();
            }
            steps++;
        }

        const finalResponse = finalContent.replace(/SEARCH:|CALC:|ANSWER/g, "").trim();
        await addMessage("user", userInput);
        await addMessage("ai", finalResponse);
        return finalResponse;
    } catch (err: any) {
        console.error("Brain Error:", err);
        return "⚠️ Architect Brain Glitch: " + (err.message || "Unknown error");
    }
}
