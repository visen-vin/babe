import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { chromium } from "playwright";

/**
 * "Why": Real-world tasks often require browsing the web like a human (e.g., bypassing API limits, reading live data).
 * "What": A tool that navigates to a URL and grabs the text content.
 */
export const browserTool = tool(
    async ({ url }) => {
        let browser;
        try {
            console.log(`🤖 Opening browser: ${url}...`);
            browser = await chromium.launch({ headless: true });
            const context = await browser.newContext();
            const page = await context.newPage();

            await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });

            // Get the core text - simplify it to avoid context bloat
            const text = await page.evaluate(() => document.body.innerText);

            return text.slice(0, 5000); // Only return first 5000 chars
        } catch (error: any) {
            return `Failed to browse ${url}: ${error.message}`;
        } finally {
            if (browser) await browser.close();
        }
    },
    {
        name: "browse_url",
        description: "Use this to visit a website and read its content (web browsing).",
        schema: z.object({
            url: z.string().describe("The full URL to visit (e.g., 'https://google.com')"),
        }),
    }
);
