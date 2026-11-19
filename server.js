import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import { Bot, InlineKeyboard } from 'grammy';
import { createHmac, timingSafeEqual } from 'node:crypto';

const required = ['BOT_TOKEN', 'WEB_APP_URL', 'ADMIN_CHAT_ID'];
for (const key of required) if (!process.env[key]) console.warn(`Missing environment variable: ${key}`);

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
const bot = process.env.BOT_TOKEN ? new Bot(process.env.BOT_TOKEN) : null;
const port = Number(process.env.PORT || 3000);

function verifyTelegramInitData(initData) {
  if (!initData || !process.env.BOT_TOKEN) return null;
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;
  params.delete('hash');
  const dataCheckString = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(process.env.BOT_TOKEN).digest();
  const expected = createHmac('sha256', secret).update(dataCheckString).digest('hex');
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const authDate = Number(params.get('auth_date') || 0);
  if (!authDate || Math.abs(Date.now() / 1000 - authDate) > 86400) return null;
  try { return JSON.parse(params.get('user') || 'null'); } catch { return null; }
}

function requireTelegramUser(req, res, next) {
  const user = verifyTelegramInitData(req.get('x-telegram-init-data'));
  if (!user?.id) return res.status(401).json({ error: 'Telegram verification failed. Open this app from the bot.' });
  req.telegramUser = user;
  next();
}

app.use(express.static('public'));
app.get('/health', (_req, res) => res.json({ ok: true, service: 'JokeMasterBD' }));

app.post('/api/video', requireTelegramUser, upload.single('video'), async (req, res) => {
  if (req.body?.recordingConsent !== 'yes') return res.status(403).json({ error: 'Recording consent is required.' });
  if (!req.file || !req.file.mimetype.startsWith('video/')) return res.status(400).json({ error: 'A valid video is required.' });
  if (!process.env.ADMIN_CHAT_ID || !bot) return res.status(503).json({ error: 'Bot delivery is not configured yet.' });
  try {
    const caption = `JokeMasterBD: ভিডিও পাঠিয়েছেন ${req.telegramUser.first_name || 'একজন ব্যবহারকারী'} (Telegram ID: ${req.telegramUser.id}). সম্মতিসহ পাঠানো হয়েছে।`;
    await bot.api.sendVideo(process.env.ADMIN_CHAT_ID, new Blob([req.file.buffer], { type: req.file.mimetype }), {
      caption,
      supports_streaming: true
    });
    res.json({ ok: true, message: 'ভিডিও সফলভাবে পাঠানো হয়েছে।' });
  } catch (error) {
    console.error('Telegram delivery failed:', error.message);
    res.status(502).json({ error: 'ভিডিও পাঠানো যায়নি। পরে আবার চেষ্টা করুন।' });
  }
});

if (bot) {
  bot.command('start', async ctx => {
    const keyboard = new InlineKeyboard().webApp('JokeMasterBD খুলুন', process.env.WEB_APP_URL);
    await ctx.reply('স্বাগতম! ক্যামেরা ব্যবহার ও ভিডিও পাঠানো সম্পূর্ণ আপনার নিয়ন্ত্রণে। চালিয়ে যেতে Mini App খুলুন।', { reply_markup: keyboard });
  });
  bot.command('help', ctx => ctx.reply('ভিডিও পাঠাতে /start লিখে Mini App খুলুন। ক্যামেরা ও রেকর্ডিংয়ের জন্য আলাদা সম্মতি প্রয়োজন।'));
  bot.catch(error => console.error('Bot error:', error.message));
  bot.start().catch(error => console.error('Bot startup error:', error.message));
}

app.listen(port, () => console.log(`JokeMasterBD server listening on ${port}`));