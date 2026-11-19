# JokeMasterBD

Consent-based Telegram bot and Mini App for recording and sending a video.

## What it does

- A user opens the Mini App themselves from the Telegram bot.
- Telegram Web App `initData` is verified on the server using the bot token.
- Camera access requires the user's browser permission.
- Recording and sending require a separate confirmation.
- The user sees a live camera preview and can stop the camera.
- After the user stops recording, the video is sent to the configured admin Telegram chat.
- The server holds the upload in memory only; it does not save video files to disk.
- The bot token stays in server environment variables, never in browser code or Git.

## Deploy on Render

1. Create a new **Web Service** in Render and connect this repository.
2. Select branch `feature/consent-based-mini-app`.
3. Runtime: Node. Build command: `npm install`. Start command: `npm start`.
4. Add environment variables:
   - `BOT_TOKEN`: create a bot with Telegram's official @BotFather and paste its token here.
   - `ADMIN_CHAT_ID`: your private Telegram chat ID. Start your bot, send `/id`, and copy the number it replies with.
   - `WEB_APP_URL`: the public HTTPS URL Render assigns to your service, e.g. `https://your-service.onrender.com`.
5. After deployment, open @BotFather and set the Mini App domain to the hostname of your Render URL (without `https://` or a path).
6. Open your bot in Telegram and send `/start`.

## Run locally

1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env` and set the three values above.
4. Run `npm start`. Telegram Mini Apps and camera access require a public HTTPS URL, so local testing needs an HTTPS tunnel or deployed host.

## Safety and limitations

- The app cannot secretly activate another person's camera. The person must open the bot, open the Mini App, grant camera permission, and separately confirm recording/sending.
- Video is sent to the single configured admin chat. Do not use this with people who have not knowingly agreed.
- Upload size is limited to 25 MB.
- The app does not retain uploaded videos on its server. Telegram delivery creates a copy in the admin chat.
- Use a private admin chat, protect Render environment variables, and never share or commit the real bot token.
- This is an initial implementation. Test on a private bot and with consenting testers before public release.
