# JokeMasterBD

Consent-based Telegram bot and Mini App for recording and sending a video.

## Current implementation

- Telegram bot opens a Telegram Mini App.
- Backend verifies Telegram Web App `initData` with the bot token.
- Camera access requires a browser permission prompt.
- Recording and sending require a separate, explicit confirmation.
- Video is held in memory and sent to the configured admin chat using Telegram Bot API; this app does not save videos to disk.
- The real bot token stays in server environment variables and must never be placed in frontend code or committed to Git.

## Setup

1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env` and fill in:
   - `BOT_TOKEN`: token from BotFather.
   - `WEB_APP_URL`: public HTTPS URL hosting this app.
   - `ADMIN_CHAT_ID`: Telegram chat ID that should receive videos. The admin must start the bot first.
4. Run `npm start`.
5. Configure the bot's Mini App domain with BotFather to match the HTTPS host.
6. Open the bot in Telegram and send `/start`.

## Important limitations

- This is an initial scaffold, not a deployed bot. A public HTTPS host is required for Telegram Mini Apps and camera access.
- A user must open the bot and Mini App themselves. The bot cannot silently activate another person's camera.
- Browser camera permission and recording/sending consent are separate.
- Uploads are limited to 25 MB in this initial version.
- Configure HTTPS, rate limits, monitoring, and production hosting before public use.
