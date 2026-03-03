import { ChatGroq } from "@langchain/groq";

// "Why": Model config ko ek jagah rakhne se kal ko model switch karna asaan hota hai.
export const model = new ChatGroq({
    apiKey: process.env.GROQ_API_KEY as string,
    model: "llama3-70b-8192",
});
