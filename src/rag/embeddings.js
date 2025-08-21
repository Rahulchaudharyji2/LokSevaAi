import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';

export function getEmbeddings() {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Missing GOOGLE_API_KEY (or GEMINI_API_KEY).');

  return new GoogleGenerativeAIEmbeddings({
    apiKey,
    model: 'text-embedding-004', // fast, high-quality
  });
}
