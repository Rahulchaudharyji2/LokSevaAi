import 'dotenv/config';
import { fetchHTML } from './scraper.js';
import { extractText } from './scraper.js';
import { SOURCES } from './sources.js';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { PineconeStore } from '@langchain/pinecone';
import { getEmbeddings } from '../rag/embeddings.js';
import { getPineconeIndex } from '../rag/pinecone.js';
import * as cheerio from 'cheerio';
import url from 'url';

async function fetchAndExtractText(pageUrl) {
  const html = await fetchHTML(pageUrl);
  return extractText(html);
}

async function discoverDetailUrls(listUrl) {
  const html = await fetchHTML(listUrl);
  const $ = cheerio.load(html);
  const links = new Set();

  $('table tbody tr').each((_, tr) => {
    const anchor = $(tr).find('td a').first();
    const href = anchor.attr('href');
    if (href) {
      // Resolve relative URLs correctly
      const absolute = url.resolve(listUrl, href);
      links.add(absolute);
    }
  });

  return Array.from(links);
}

async function run() {
  const index = await getPineconeIndex();
  const embeddings = getEmbeddings();
  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1200, chunkOverlap: 150 });

  for (const src of SOURCES) {
    console.log('Fetching listing:', src.url);
    const { title, text } = await fetchAndExtractText(src.url);
    if (text?.length > 50) {
      const docs = await splitter.createDocuments([text], [{
        url: src.url,
        title,
        ministry: src.ministry,
        topic: src.topic,
        crawledAt: new Date().toISOString(),
        lang: 'en'
      }]);
      await PineconeStore.fromDocuments(docs, embeddings, {
        pineconeIndex: index,
        textKey: 'text',
        maxConcurrency: 5,
      });
      console.log(`Indexed listing (${docs.length} chunks).`);
    }

    // Discover detail pages
    console.log('Discovering detail links...');
    const detailUrls = await discoverDetailUrls(src.url);
    console.log('Found', detailUrls.length, 'detail URLs.');

    for (const detailUrl of detailUrls) {
      console.log('Fetching detail:', detailUrl);
      try {
        const { title: dTitle, text: dText } = await fetchAndExtractText(detailUrl);
        if (dText && dText.length > 50) {
          const docs = await splitter.createDocuments([dText], [{
            url: detailUrl,
            title: dTitle,
            ministry: src.ministry,
            topic: src.topic,
            crawledAt: new Date().toISOString(),
            lang: 'en'
          }]);
          await PineconeStore.fromDocuments(docs, embeddings, {
            pineconeIndex: index,
            textKey: 'text',
            maxConcurrency: 5,
          });
          console.log(`Indexed detail (${docs.length} chunks) from ${detailUrl}`);
        } else {
          console.warn('No text at detail:', detailUrl);
        }
      } catch (e) {
        console.warn('Error fetching detail:', detailUrl, e.message);
      }
    }
  }

  console.log('Indexing complete ✅');
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
