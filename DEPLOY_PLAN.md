# Vaspbot Deployment Plan: Docker + Telegram + AWS

This plan outlines the steps to move from local terminal chat to a cloud-hosted Telegram bot.

## 1. Development (Local)
- [ ] **Telegram Integration:** Add `telegraf` and modify `src/index.ts` to handle Telegram messages instead of terminal input.
- [ ] **Environment Keys:** Add `TELEGRAM_BOT_TOKEN` to `.env`.

## 2. Dockerization (Packaging)
- [ ] **Dockerfile:** Create a Dockerfile using `oven/bun` and install Playwright dependencies.
- [ ] **Volumes:** Ensure `SOUL.md` and `MEMORY.md` are mounted as volumes so memory persists across container restarts.

## 3. Infrastructure (AWS)
- [ ] **SSH to Instance:** Already connected to `52.63.73.227`.
- [ ] **Install Docker:** Verify/Install Docker and Docker Compose on the server.
- [ ] **Transfer Code:** Use `git` or `scp` to move the `/bot` folder to AWS.

## 4. Launch & Monitor
- [ ] **Compose Up:** Run `docker-compose up -d`.
- [ ] **Health Check:** Test the bot via Telegram chat.
- [ ] **Logs:** Monitor using `docker logs -f vaspbot`.

---

### Why Docker is better for Vaspbot?
1. **Playwright Dependencies:** Playwright needs specific Linux libs. Docker's official images have them pre-installed.
2. **Persistence:** Simple volume mapping for memory files.
3. **Restart Policy:** Docker will automatically restart the bot if it crashes or the server reboots.
