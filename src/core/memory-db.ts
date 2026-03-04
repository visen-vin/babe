import { Database } from "bun:sqlite";
import * as fs from "node:fs/promises";
import * as path from "node:path";

const DB_PATH = "vasp_memory.sqlite";

export class MemoryDB {
    private db: Database;

    constructor() {
        this.db = new Database(DB_PATH);
        this.init();
    }

    private init() {
        // Create FTS5 table for fast keyword searching
        this.db.run(`
            CREATE VIRTUAL TABLE IF NOT EXISTS documents USING fts5(
                path,
                content,
                tokenize='porter unicode61'
            );
        `);
    }

    async indexFiles(rootDirectory: string) {
        // Clear old index
        this.db.run("DELETE FROM documents");

        const dirsToIndex = [
            path.join(rootDirectory, "memory_legacy"),
            rootDirectory
        ];

        for (const dir of dirsToIndex) {
            try {
                if (!(await fs.stat(dir)).isDirectory()) continue;

                const files = await this.recursiveReaddir(dir);
                for (const file of files) {
                    if (file.endsWith(".md")) {
                        const content = await fs.readFile(file, "utf-8");
                        const relativePath = path.relative(rootDirectory, file);
                        this.db.run("INSERT INTO documents (path, content) VALUES (?, ?)", [relativePath, content]);
                    }
                }
            } catch (e) {
                // Skip if directory doesn't exist
            }
        }
        console.log(`[MemoryDB] Indexing complete.`);
    }

    private async recursiveReaddir(dir: string): Promise<string[]> {
        const subdirs = await fs.readdir(dir);
        const files = await Promise.all(subdirs.map(async (subdir) => {
            if (["node_modules", ".git", ".gemini", "dist", "build", "api-logs"].includes(subdir)) return [];
            const res = path.resolve(dir, subdir);
            return (await fs.stat(res)).isDirectory() ? this.recursiveReaddir(res) : res;
        }));
        return files.flat();
    }

    search(query: string, limit: number = 5) {
        const results = this.db.query(`
            SELECT path, snippet(documents, 1, '---', '---', '...', 30) as snippet, rank
            FROM documents 
            WHERE documents MATCH ? 
            ORDER BY rank 
            LIMIT ?
        `).all(query, limit);

        return results;
    }
}

export const memoryDB = new MemoryDB();
