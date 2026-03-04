import { model } from "../core/llm";
import { webSearchTool, fileReaderTool, fileWriterTool, memorySearchTool, browserTool, calculatorTool } from "../tools/index";
import { AIMessage, HumanMessage, SystemMessage, BaseMessage } from "@langchain/core/messages";
import { getHistory, addMessage } from "../memory/history";

/**
 * Core Agent Logic for Vaspbot
 */
export async function executeAgentFlow(userInput: string) {
    try {
        console.log(`[Brain] Query: ${userInput}`);

        // 🧠 Load Soul and Memory files (Only once per query)
        const soul = await (fileReaderTool as any).invoke({ fileName: "SOUL.md" });
        const memory = await (fileReaderTool as any).invoke({ fileName: "MEMORY.md" });

        // 🕰️ Get Recent History
        const history = await getHistory();
        const recentHistory = history.slice(-6); // Last 3 exchanges

        const systemPrompt = `You are Vaspbot, a professional AI Architect and a loyal partner to Vinayak Singh.
        
        --- IDENTITY ---
        ${soul}
        --- MISSIONS ---
        ${memory}
        -----------------

        INSTRUCTIONS:
        1. **Identity:** Vinayak Singh is your Boss. Use "Ji" and a polite Hindi/English mix. 
        2. **Legacy:** Use SEARCH_MEMORY if you don't know something about Vinayak Ji (Name, Goals, etc.).
        3. **Tone:** Be concise and analytical. No corporate fluff.

        TOOLS:
        - Web Search: SEARCH: [query]
        - Browse URL: BROWSE: [url]
        - Local Memory Search: SEARCH_MEMORY: [query]
        - Read File: READ: [path]
        - Write File: WRITE: [filename]\n[content]
        - Math: CALC: [expression]
        - Final Answer: ANSWER: [hindi/english response]`;

        const messages: BaseMessage[] = [
            new SystemMessage(systemPrompt),
            ...recentHistory,
            new HumanMessage(userInput),
        ];

        let steps = 0;
        let finalContent = "";

        while (steps < 4) {
            const result = (await model.invoke(messages)) as AIMessage;
            const content = result.content as string;
            finalContent = content;

            if (content.includes("SEARCH:")) {
                const query = content.split("SEARCH:")[1]?.trim().split("\n")[0];
                console.log(`[Tool] Searching web: ${query}`);
                const searchResult = await (webSearchTool as any).invoke({ query });
                messages.push(new AIMessage(content));
                messages.push(new HumanMessage(`Search Results: ${searchResult}`));
            } else if (content.includes("BROWSE:")) {
                const url = content.split("BROWSE:")[1]?.trim().split("\n")[0];
                console.log(`[Tool] Browsing: ${url}`);
                const browseResult = await (browserTool as any).invoke({ url });
                messages.push(new AIMessage(content));
                messages.push(new HumanMessage(`Browser Results: ${browseResult}`));
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

        const finalResponse = finalContent.replace(/SEARCH:|BROWSE:|CALC:|ANSWER:/g, "").trim();
        await addMessage("user", userInput);
        await addMessage("ai", finalResponse);
        return finalResponse;
    } catch (err: any) {
        console.error("Brain Error:", err.message);
        if (err.message.includes("429")) {
            return "Vinayak Ji, Groq ki limit khatam ho gayi hai. Please 15 minutes wait karein ya model switch karne ko kahein. 🙏";
        }
        return "⚠️ Architect Brain Glitch: " + err.message;
    }
}

