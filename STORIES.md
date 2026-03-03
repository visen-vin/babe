# Vaspbot Developer Stories

## Story 1: As a Developer, I need to talk to Gemini (The Brain).
- **Task 1.1:** Setup `npm init -y` inside `/bot`. (✅ Done)
- **Task 1.2:** Install `@langchain/google-genai`, `@langchain/core`, `dotenv`. (✅ Done)
- **Task 1.3:** Create `brain.js` for basic model invocation. (✅ Ready)
- **Task 1.4:** Test connectivity using `node brain.js`. (⏳ Pending)

## Story 2: As a User, I want the bot to remember what I said (The Memory).
- **Task 2.1:** Create a shared chat memory module.
- **Task 2.2:** Wrap the model call in a LangChain `ConversationChain`.
- **Task 2.3:** Add local file storage for chat history.

## Story 3: As a Power User, I want the bot to have specialized skills (The Tools).
- **Task 3.1:** Create a "Search Tool" (Google Search/Tavily).
- **Task 3.2:** Create a "File Tool" (to read and write local READMEs).
- **Task 3.3:** Combine Tools and Brain into an "Agent".

## Story 4: As an Architect, I want to bypass API limits (The Hijack).
- **Task 4.1:** Setup Playwright.
- **Task 4.2:** Build a browser automation script to login to Gemini Web UI.
- **Task 4.3:** Create a proxy tool to send messages to the browser and return text.
