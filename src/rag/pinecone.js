import { Pinecone } from '@pinecone-database/pinecone';
import { getEmbeddings } from './embeddings.js';

export async function getPineconeIndex() {
  const apiKey = process.env.PINECONE_API_KEY;
  const name = process.env.PINECONE_INDEX_NAME;
  const region = process.env.PINECONE_ENVIRONMENT || 'us-east-1';
  const metric = process.env.PINECONE_METRIC || 'cosine';
  if (!apiKey || !name) throw new Error('Missing PINECONE_API_KEY or PINECONE_INDEX_NAME');

  const client = new Pinecone({ apiKey });

  // Ensure index exists with correct dimension by probing the embedding size
  const embeddings = getEmbeddings();
  const dim = (await embeddings.embedQuery('dim-check')).length;

  // Create if missing
  const existing = await client.listIndexes();
  const has = existing.indexes?.some(i => i.name === name);
  if (!has) {
    console.log(`Creating Pinecone index '${name}' dim=${dim} (${metric}, ${region}) ...`);
    await client.createIndex({
      name,
      dimension: dim,
      metric,
      spec: { serverless: { cloud: 'aws', region } }
    });
    // Pinecone needs a few seconds to become ready
    let ready = false;
    while (!ready) {
      const d = await client.describeIndex(name);
      ready = d.status?.ready;
      if (!ready) await new Promise(r => setTimeout(r, 4000));
    }
    console.log('Index ready.');
  }

  return client.Index(name);
}
