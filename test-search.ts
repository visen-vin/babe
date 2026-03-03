import { webSearchTool } from "./src/tools/index";
import * as dotenv from "dotenv";
dotenv.config();

async function test() {
    console.log("Testing searchWeb tool...");
    try {
        const result = await (webSearchTool as any).invoke({ query: "India vs England cricket match 2025" });
        console.log("Result:", result);
    } catch (e) {
        console.error("Tool failed:", e);
    }
}

test();
