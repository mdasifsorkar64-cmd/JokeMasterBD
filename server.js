import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import { Bot, InlineKeyboard, InputFile } from 'grammy';
import { createHmac, timingSafeEqual } from 'node:crypto';

const required = ['BOT_TOKEN', 'WEB_APP_URL', 'ADMIN_CHAT_ID'];
for (const key of required) {
  if (!process.env[key]) console.warn(`Missing environment variable: ${key}`);
}

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 1 }
});
const bot = process.env.BOT_TOKEN ? new Bot(process.env.BOT_TOKEN) : null;
const port = Number(process.env.PORT || 3000);

function verifyTelegramInitData(initData) {
  if (!initData || !process.env.BOT_TOKEN) return null;
  const params = new URLSearchParams(initData);
  const receivedHash = params.get('hash');
  if (!receivedHash || !/^[a-f0-9]{64}$/i.test(receivedHash)) return null;

  params.delete('hash');
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = createHmac('sha256', 'WebAppData')
    .update(process.env.BOT_TOKEN)
    .digest();
  const expectedHash = createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  const received = Buffer.from(receivedHash, 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;

  const authDate = Number(params.get('auth_date') || 0);
  const ageSeconds = Math.floor(Date.now() / 1000) - authDate;
  if (!authDate || ageSeconds < -60 || ageSeconds > 600) return null;

  try {
    const user = JSON.parse(params.get('user') || 'null');
    return user && Number.isSafeInteger(user.id) ? user : null;
  } catch {
    return null;
  }
}

function requireTelegramUser(req, res, next) {
  const user = verifyTelegramInitData(req.get('x-telegram-init-data'));
  if (!user) {
    return res.status(401).json({ error: 'Telegram যাচাই করা যায়নি। বট থেকে Mini App খুলুন।' });
  }
  req.telegramUser = user;
  next();
}

app.use(express.static('public'));
app.get('/health', (_req, res) => res.json({ ok: true, service: 'JokeMasterBD' }));

app.post('/api/video', requireTelegramUser, (req, res, next) => {
  upload.single('video')(req, res, error => {
    if (error) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'ভিডিও সর্বোচ্চ ২৫ MB হতে পারবে।' });
      }
      return res.status(400).json({ error: 'ভিডিও আপলোড গ্রহণ করা যায়নি।' });
    }
    next();
  });
}, async (req, res) => {
  if (req.body?.recordingConsent !== 'yes') {
    return res.status(403).json({ error: 'ভিডিও রেকর্ড ও পাঠানোর সম্মতি প্রয়োজন।' });
  }
  if (!req.file || !req.file.mimetype.startsWith('video/')) {
    return res.status(400).json({ error: 'সঠিক ভিডিও ফাইল পাওয়া যায়নি।' });
  }
  if (!process.env.ADMIN_CHAT_ID || !bot) {
    return res.status(503).json({ error: 'বট ডেলিভারি এখনো কনফিগার করা হয়নি।' });
  }

  try {
    const extension = req.file.mimetype.includes('mp4') ? 'mp4' : 'webm';
    const firstName = String(req.telegramUser.first_name || 'ব্যবহারকারী').slice(0, 60);
    await bot.api.sendVideo(
      process.env.ADMIN_CHAT_ID,
      new InputFile(req.file.buffer, `jokemasterbd-video.${extension}`),
      {
        caption: `JokeMasterBD: ${firstName} (Telegram ID: ${req.telegramUser.id}) সম্মতি দিয়ে ভিডিও পাঠিয়েছেন।`,
        supports_streaming: true
      }
    );
    return res.json({ ok: true, message: 'ভিডিও সফলভাবে পাঠানো হয়েছে।' });
  } catch (error) {
    console.error('Telegram delivery failed:', error.message);
    return res.status(502).json({ error: 'ভিডিও পাঠানো যায়নি। পরে আবার চেষ্টা করুন।' });
  }
});

if (bot) {
  bot.command('start', async ctx => {
    const keyboard = new InlineKeyboard().webApp('JokeMasterBD খুলুন', process.env.WEB_APP_URL);
    await ctx.reply(
      'স্বাগতম! ক্যামেরা চালু এবং ভিডিও রেকর্ড/পাঠানোর অনুমতি আলাদাভাবে আপনার কাছ থেকে নেওয়া হবে।',
      { reply_markup: keyboard }
    );
  });
  bot.command('help', ctx => ctx.reply(
    'ভিডিও পাঠাতে /start লিখে Mini App খুলুন। ক্যামেরা অনুমতি এবং রেকর্ড/পাঠানোর সম্মতি আলাদা।'
  ));
  bot.catch(error => console.error('Bot error:', error.message));
  bot.start().catch(error => console.error('Bot startup error:', error.message));
}

app.listen(port, () => console.log(`JokeMasterBD listening on port ${port}`));
