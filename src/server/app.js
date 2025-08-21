import 'dotenv/config';
import express from 'express';
import router from './routes.js'; // default export use ho raha hai

// WhatsApp bot imports
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';

import { detectLang } from '../rag/language.js';
import { searchSnippets } from '../rag/retriever.js';
import { ANSWER_SYSTEM_PROMPT, buildUserPrompt } from '../rag/prompts.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use('/api', router);

// Gemini + WhatsApp bot
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});


client.on('qr', (qr) => qrcode.generate(qr, { small: true }));
client.on('ready', () => console.log('WhatsApp bot ready!'));

client.on('message', async (message) => {
  if (message.body.startsWith('.bot')) {
    const regxmatch = message.body.match(/.bot\s*(.+)/);
    const query = regxmatch ? regxmatch[1].trim() : "Hi";

    try {
      // 🔹 API ko call karo jo already /api/ask me defined hai
      const res = await fetch('http://localhost:3000/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });

      const data = await res.json();

      // 🔹 Agar API ne answer diya
      if (data.answer) {
        let finalMsg = `*Answer:*\n${data.answer}\n\n*Sources:*`;
        if (data.sources?.length) {
          data.sources.forEach((s, i) => {
            finalMsg += `\n${i + 1}. ${s.title} - ${s.url}`;
          });
        }
        await message.reply(finalMsg);
      } else {
        await message.reply(
          'Sorry, I could not find reliable info for that. Please clarify your query.'
        );
      }

    } catch (err) {
      console.error("Error in WhatsApp bot:", err);
      await message.reply("Sorry, kuch problem aa gayi hai.");
    }
  }
});



client.initialize();

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`LokSeva AI running at http://localhost:${port}`));
