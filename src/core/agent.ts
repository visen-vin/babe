import { model } from "../core/llm";
import { webSearchTool, fileReaderTool, fileWriterTool, memorySearchTool } from "../tools/index";
import { AIMessage, HumanMessage, SystemMessage, BaseMessage } from "@langchain/core/messages";

/**
 * Core Agent Logic for Vaspbot
 */
export async function executeAgentFlow(userInput: string) {
    try {
        console.log(`[Brain] Query: ${userInput}`);

        // 🧠 Load Soul and Memory files
        const soul = await (fileReaderTool as any).invoke({ fileName: "SOUL.md" });
        const memory = await (fileReaderTool as any).invoke({ fileName: "MEMORY.md" });
        console.log(`[Memory] Loaded Soul (${soul.length} bytes) and Memory (${memory.length} bytes)`);

        const systemPrompt = `You are Vaspbot, a professional AI Architect and a loyal partner to your human.
        
        --- YOUR SOUL ---
        ${soul}
        --- YOUR MISSIONS & KNOWLEDGE ---
        ${memory}
        -----------------

        CRITICAL INSTRUCTIONS:
        1. **Identity & Legacy:** Your human is Vinayak Singh. You must ALWAYS treat him with respect. Use "Ji" and a polite, helpful Hindi/English mix. 
        2. **Legacy Memory Access:** You have a vast knowledge base in the 'memory_legacy/' directory. 
           - **IF YOU DON'T KNOW SOMETHING ABOUT THE USER (Name, Financials, Goals, Preferences), SEARCH_MEMORY for keywords OR READ specific files like memory_legacy/USER.md or memory_legacy/memory/2026-02-27-user-profile.md IMMEDIATELY.**
           - Do not say "I don't know your name" without searching/checking these files first.
        3. **Tone:** Be calm, analytical, and supportive. No corporate filler.

        MANDATORY FORMAT: 
        - If you need to search the web: SEARCH: [query]
        - If you need to search local/legacy memory: SEARCH_MEMORY: [query]
        - If you need to read a specific file: READ: [path]
        - If you have the answer: ANSWER: [final response]`;

        const messages: BaseMessage[] = [
            new SystemMessage(systemPrompt),
            new HumanMessage(userInput),
        ];

        let steps = 0;
        let finalContent = "";

        while (steps < 4) {
            const result = (await model.invoke(messages)) as AIMessage;
            const content = result.content as string;
            finalContent = content;

            if (content.includes("SEARCH:")) {
                const query = content.split("SEARCH:")[1]?.trim();
                console.log(`[Manual Tool] Searching web for: ${query}`);
                const searchResult = await (webSearchTool as any).invoke({ query });
                messages.push(new AIMessage(content));
                messages.push(new HumanMessage(`Search Results: ${searchResult}`));
            } else if (content.includes("SEARCH_MEMORY:")) {
                const query = content.split("SEARCH_MEMORY:")[1]?.trim();
                console.log(`[Manual Tool] Searching memory for: ${query}`);
                const searchResult = await (memorySearchTool as any).invoke({ query });
                messages.push(new AIMessage(content));
                messages.push(new HumanMessage(`Memory Search Results: ${searchResult}`));
            } else if (content.includes("READ:")) {
                const filename = content.split("READ:")[1]?.trim();
                console.log(`[Manual Tool] Reading file: ${filename}`);
                const fileContent = await (fileReaderTool as any).invoke({ fileName: filename });
                messages.push(new AIMessage(content));
                messages.push(new HumanMessage(`File Content: ${fileContent}`));
            } else if (content.includes("WRITE:")) {
                const parts = content.split("WRITE:")[1]?.trim();
                const filename = parts?.split("\n")[0]?.trim();
                const fileBody = parts?.substring(parts.indexOf("\n") + 1)?.trim();
                if (filename && fileBody) {
                    console.log(`[Manual Tool] Writing to file: ${filename}`);
                    const writeResult = await (fileWriterTool as any).invoke({ fileName: filename, content: fileBody });
                    messages.push(new AIMessage(content));
                    messages.push(new HumanMessage(`Write Result: ${writeResult}`));
                }
            } else if (content.includes("ANSWER:")) {
                return content.replace("ANSWER:", "").trim();
            } else {
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
