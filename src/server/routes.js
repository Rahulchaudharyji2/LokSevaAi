import express from 'express';
import { detectLang } from '../rag/language.js';
import { searchSnippets } from '../rag/retriever.js';
import { ANSWER_SYSTEM_PROMPT, buildUserPrompt } from '../rag/prompts.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = express.Router();

router.post('/ask', async (req, res) => {
  try {
    const { query, ministryNamespace } = req.body || {};
    if (!query) return res.status(400).json({ error: 'query is required' });

    const lang = detectLang(query);
    const snippets = await searchSnippets(query, ministryNamespace, lang);

    if (!snippets.length) {
      return res.json({
        answer: lang === 'hi'
          ? 'माफ़ कीजिए, अभी स्पष्ट जानकारी नहीं मिली। कृपया अपना सवाल और स्पष्ट लिखें।'
          : 'Sorry, I could not find reliable info for that. Please clarify your query.'
      });
    }

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `${ANSWER_SYSTEM_PROMPT}\n\n${buildUserPrompt(query, snippets)}`;
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    res.json({
      answer: text,
      sources: snippets.map((s, i) => ({ id: i+1, url: s.url, title: s.title }))
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'Internal error' });
  }
});

export default router;
