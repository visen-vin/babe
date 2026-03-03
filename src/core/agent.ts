import { model } from "../core/llm";
import { webSearchTool, fileReaderTool, fileWriterTool } from "../tools/index";
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

        const systemPrompt = `You are Vaspbot, a professional AI Architect.
        
        --- YOUR SOUL ---
        ${soul}
        --- YOUR MEMORY & MISSIONS ---
        ${memory}
        -----------------

        MANDATORY FORMAT: 
        - If you need to search: SEARCH: [query]
        - If you need to read: READ: [filename]
        - If you have the answer: ANSWER: [final response]
        
        Combine your soul, your memory, and tools to help the user. 
        Only use tools if necessary. If you change your SOUL or MEMORY, tell the user.`;

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
