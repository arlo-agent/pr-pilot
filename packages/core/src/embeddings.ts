import { createHash } from 'crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import type { EmbeddedItem } from './types.js';

const CACHE_FILE = '.pr-pilot-cache.json';
const MAX_BODY_LENGTH = 2000;
const MAX_BATCH_SIZE = 2048;

interface CacheEntry {
  number: number;
  type: 'pr' | 'issue';
  title: string;
  textHash: string;
  embedding: number[];
}

function buildText(item: { number: number; type: 'pr' | 'issue'; title: string; body: string }): string {
  const tag = item.type === 'pr' ? 'PR' : 'Issue';
  const body = (item.body ?? '').slice(0, MAX_BODY_LENGTH);
  return `[${tag}] #${item.number}: ${item.title}\n${body}`;
}

function hashText(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

function loadCache(): Map<string, CacheEntry> {
  const map = new Map<string, CacheEntry>();
  if (!existsSync(CACHE_FILE)) return map;
  try {
    const data = JSON.parse(readFileSync(CACHE_FILE, 'utf-8')) as CacheEntry[];
    for (const entry of data) {
      map.set(`${entry.type}-${entry.number}`, entry);
    }
  } catch {
    // ignore corrupt cache
  }
  return map;
}

function saveCache(items: EmbeddedItem[]): void {
  writeFileSync(CACHE_FILE, JSON.stringify(items, null, 2));
}

export async function generateEmbeddings(
  items: { number: number; type: 'pr' | 'issue'; title: string; body: string }[],
  apiKey: string,
  model = 'text-embedding-3-small',
): Promise<EmbeddedItem[]> {
  const cache = loadCache();
  const results: EmbeddedItem[] = [];
  const toEmbed: { index: number; text: string; item: typeof items[number] }[] = [];

  // Check cache
  for (const item of items) {
    const text = buildText(item);
    const hash = hashText(text);
    const key = `${item.type}-${item.number}`;
    const cached = cache.get(key);

    if (cached && cached.textHash === hash) {
      results.push(cached);
    } else {
      toEmbed.push({ index: results.length, text, item });
      results.push({
        number: item.number,
        type: item.type,
        title: item.title,
        embedding: [],
        textHash: hash,
      });
    }
  }

  // Batch embed
  for (let i = 0; i < toEmbed.length; i += MAX_BATCH_SIZE) {
    const batch = toEmbed.slice(i, i + MAX_BATCH_SIZE);
    const texts = batch.map((b) => b.text);

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input: texts, model }),
    });

    const data = (await response.json()) as {
      data?: { embedding: number[]; index: number }[];
      error?: { message: string; type: string };
    };

    if (!response.ok || !data.data) {
      const msg = data.error?.message ?? `HTTP ${response.status}`;
      throw new Error(`OpenAI embeddings API error: ${msg}`);
    }

    for (const d of data.data) {
      const entry = batch[d.index];
      results[entry.index].embedding = d.embedding;
    }
  }

  saveCache(results);
  return results;
}
