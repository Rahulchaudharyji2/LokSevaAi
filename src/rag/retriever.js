import { PineconeStore } from '@langchain/pinecone';
import { getPineconeIndex } from './pinecone.js';
import { getEmbeddings } from './embeddings.js';

async function expandQuery(q, lang) {
  if (lang === 'hi') return [q, 'yojana', 'government scheme'];
  return [q, 'yojana', 'scheme', 'india government scheme'];
}

export async function searchSnippets(query, ministryNS, lang = 'en') {
  const index = await getPineconeIndex();
  const embeddings = getEmbeddings();
  const store = await PineconeStore.fromExistingIndex(embeddings, {
    pineconeIndex: index,
    namespace: ministryNS || undefined
  });

  const expanded = await expandQuery(query, lang);
  const resultsMap = new Map();

  for (const q of expanded) {
    const results = await store.similaritySearch(q, 6); // topK
    for (const d of results) {
      const url = d.metadata?.url;
      if (!url) continue;
      if (!resultsMap.has(url)) resultsMap.set(url, d); // basic dedupe
    }
  }

  const docs = Array.from(resultsMap.values()).slice(0, 6);
  return docs.map(d => ({
    text: d.pageContent.slice(0, 1200),
    url: d.metadata?.url,
    title: d.metadata?.title
  }));
}
