import { tool } from "@langchain/core/tools";
import { z } from "zod";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { Calculator } from "@langchain/community/tools/calculator";
import { browserTool } from "./browser";
// import { WikipediaQueryRun } from "@langchain/community/tools/wikipedia"; // Usually needs a backend
// import { YouTubeSearchTool } from "@langchain/community/tools/youtube_search";

// "Why": Ready-made tools humein hours of coding se bachate hain.
// "What": Community tools for Search, Math, and knowledge.

export const webSearchTool = new TavilySearchResults({
    apiKey: process.env.TAVILY_API_KEY,
    maxResults: 3,
});

export const calculatorTool = new Calculator();

// "Why": Bot ko batao ki wo files padh sakta hai.
// "What": Ek tool jo filename leta hai aur uska content return karta hai.
export const fileReaderTool = tool(
    async ({ fileName }) => {
        try {
            // workspace logic: Hum assume kar rahe hain ki hum 'bot' folder ke andar hain
            const filePath = path.join(process.cwd(), "..", fileName);
            const content = await fs.readFile(filePath, "utf-8");
            return content;
        } catch (error: any) {
            return `Error reading file: ${error.message}`;
        }
    },
    {
        name: "read_workspace_file",
        description: "Use this to read a file from the user's workspace records like SOUL.md or MEMORY.md",
        schema: z.object({
            fileName: z.string().describe("The name of the file to read (e.g., 'SOUL.md')"),
        }),
    }
);

export const tools = [fileReaderTool, webSearchTool, calculatorTool, browserTool];
