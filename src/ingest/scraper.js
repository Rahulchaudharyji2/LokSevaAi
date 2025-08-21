import axios from 'axios';
import * as cheerio from 'cheerio';

export async function fetchHTML(url) {
  const { data } = await axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'en-US,en;q=0.9' },
    timeout: 60000
  });
  return data;
}

export function extractText(html) {
  const $ = cheerio.load(html);
  const title = $('title').first().text().trim();

  // Try to extract tables (common on govt sites)
  const rows = [];
  $('table tbody tr').each((_, el) => {
    const cells = $(el).find('td').toArray().map(td => $(td).text().trim()).filter(Boolean);
    if (cells.length) rows.push(cells.join(' | '));
  });

  let text = rows.join('\n');
  if (!text) {
    // Fallback: main/page body text
    text = $('main').text().trim() || $('body').text().trim();
    text = text.replace(/\s+\n/g, '\n').replace(/\n{2,}/g, '\n');
  }

  return { title, text };
}
