import 'dotenv/config';
import { getPineconeIndex } from './pinecone.js';

const index = await getPineconeIndex();
const stats = await index.describeIndexStats({});
console.log(JSON.stringify(stats, null, 2));
