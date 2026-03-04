import { tool } from "@langchain/core/tools";
import { z } from "zod";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { TavilySearch } from "@langchain/tavily";
import { Calculator } from "@langchain/community/tools/calculator";
// import { browserTool } from "./browser";
import { memoryDB } from "../core/memory-db";
// import { WikipediaQueryRun } from "@langchain/community/tools/wikipedia"; // Usually needs a backend
// import { YouTubeSearchTool } from "@langchain/community/tools/youtube_search";

// "Why": Ready-made tools humein hours of coding se bachate hain.
// "What": Community tools for Search, Math, and knowledge.

// "Why": Ready-made tools sometimes use complex syntax that Llama on Groq fails to parse.
// "What": A simple custom tool that calls Tavily for search.
export const webSearchTool = tool(
    async ({ query }) => {
        try {
            const response = await fetch("https://api.tavily.com/search", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    api_key: process.env.TAVILY_API_KEY,
                    query: query,
                    max_results: 3,
                }),
            });
            const data = await response.json();
            return JSON.stringify(data.results.map((r: any) => ({
                title: r.title,
                url: r.url,
                content: r.content
            })));
        } catch (error: any) {
            return `Search error: ${error.message}`;
        }
    },
    {
        name: "searchWeb",
        description: "Search the web for current events, news, and facts.",
        schema: z.object({
            query: z.string().describe("The search query"),
        }),
    }
);

export const calculatorTool = new Calculator();

// "Why": Bot ko batao ki wo files padh sakta hai.
// "What": Ek tool jo filename leta hai aur uska content return karta hai.
export const fileWriterTool = tool(
    async ({ fileName, content }) => {
        try {
            const filePath = path.join(process.cwd(), "..", fileName);
            await fs.writeFile(filePath, content, "utf-8");
            return `File ${fileName} updated successfully.`;
        } catch (error: any) {
            return `Error writing file: ${error.message}`;
        }
    },
    {
        name: "writeFile",
        description: "Use this to update or create a file in the workspace like SOUL.md or MEMORY.md",
        schema: z.object({
            fileName: z.string().describe("The name of the file to write"),
            content: z.string().describe("The full content of the file"),
        }),
    }
);

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
        name: "readFile",
        description: "Use this to read a file from the user's workspace records like SOUL.md or MEMORY.md",
        schema: z.object({
            fileName: z.string().describe("The name of the file to read (e.g., 'SOUL.md')"),
        }),
    }
);

export const memorySearchTool = tool(
    async ({ query }) => {
        try {
            // Always re-index to keep it fresh for now (can be optimized later)
            await memoryDB.indexFiles(path.join(process.cwd(), ".."));
            const results = memoryDB.search(query);
            if (results.length === 0) return "No matches found in local memory.";
            return JSON.stringify(results);
        } catch (error: any) {
            return `Memory Search error: ${error.message}`;
        }
    },
    {
        name: "searchMemory",
        description: "Search internal memory, records, and legacy archives for facts, dates, and previous project info.",
        schema: z.object({
            query: z.string().describe("Keyword or phrase to search for in local files"),
        }),
    }
);

import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export const gitPushTool = tool(
    async ({ message }) => {
        try {
            // We assume we are in the 'bot' folder or the root is reachable
            const { stdout, stderr } = await execAsync(`git add .. && git commit -m "${message}" && git push origin master`);
            return `Git Update Successful:\n${stdout}\n${stderr}`;
        } catch (error: any) {
            return `Git Error: ${error.message}`;
        }
    },
    {
        name: "gitPush",
        description: "Commit and push changes to the GitHub repository. Use this to sync README.md or other project files.",
        schema: z.object({
            message: z.string().describe("The commit message"),
        }),
    }
);

// export { browserTool };
export const tools = [fileReaderTool, fileWriterTool, webSearchTool, calculatorTool, memorySearchTool, gitPushTool];
