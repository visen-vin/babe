import { ChatGroq } from "@langchain/groq";

// "Why": Model config ko ek jagah rakhne se kal ko model switch karna asaan hota hai.
export const model = new ChatGroq({
    apiKey: process.env.GROQ_API_KEY as string,
    model: "mixtral-8x7b-32768",
});
