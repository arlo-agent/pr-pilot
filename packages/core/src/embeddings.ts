import { createHash } from 'crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import type { EmbeddedItem, BatchOptions } from './types.js';
import { DEFAULT_BATCH_OPTIONS } from './types.js';

const CACHE_FILE = '.pr-pilot-cache.json';
const MAX_BODY_LENGTH = 2000;

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  maxRetries: number,
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, init);
    if (response.status === 429) {
      if (attempt >= maxRetries) {
        const err = new Error(`OpenAI rate limit (429) after ${maxRetries + 1} attempts. State saved — run again to resume.`);
        (err as Error & { rateLimited: boolean }).rateLimited = true;
        throw err;
      }
      // Read retry-after header, or use exponential backoff starting at 10s
      const retryAfter = response.headers.get('retry-after');
      const waitMs = retryAfter
        ? parseInt(retryAfter, 10) * 1000
        : Math.min(10000 * Math.pow(2, attempt), 120000);
      console.log(`\n  ⏳ Rate limited, waiting ${Math.round(waitMs / 1000)}s (attempt ${attempt + 1}/${maxRetries + 1})...`);
      await sleep(waitMs);
      continue;
    }
    return response;
  }
  throw new Error('fetchWithRetry exhausted');
}

export interface EmbeddingProgress {
  cached: number;
  embedded: number;
  total: number;
  batchesCompleted: number;
  totalBatches: number;
}

export async function generateEmbeddings(
  items: { number: number; type: 'pr' | 'issue'; title: string; body: string }[],
  apiKey: string,
  model = 'text-embedding-3-small',
  batchOptions?: Partial<BatchOptions>,
): Promise<EmbeddedItem[]> {
  const opts = { ...DEFAULT_BATCH_OPTIONS, ...batchOptions };
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

  const cachedCount = items.length - toEmbed.length;
  if (toEmbed.length === 0) {
    opts.onProgress?.(items.length, items.length, 'embeddings');
    return results;
  }

  const totalBatches = Math.ceil(toEmbed.length / opts.batchSize);

  // Batch embed with delays and retry
  let embeddedSoFar = cachedCount;
  for (let i = 0; i < toEmbed.length; i += opts.batchSize) {
    const batchNum = Math.floor(i / opts.batchSize) + 1;
    const batch = toEmbed.slice(i, i + opts.batchSize);
    const texts = batch.map((b) => b.text);

    opts.onProgress?.(embeddedSoFar, items.length, `embeddings batch ${batchNum}/${totalBatches}`);

    const response = await fetchWithRetry(
      'https://api.openai.com/v1/embeddings',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input: texts, model }),
      },
      opts.maxRetries,
    );

    const data = (await response.json()) as {
      data?: { embedding: number[]; index: number }[];
      error?: { message: string; type: string };
    };

    if (!response.ok || !data.data) {
      const msg = data.error?.message ?? `HTTP ${response.status}`;
      // Save what we have so far before throwing
      saveCache(results);
      throw new Error(`OpenAI embeddings API error: ${msg}`);
    }

    for (const d of data.data) {
      const entry = batch[d.index];
      results[entry.index].embedding = d.embedding;
    }

    embeddedSoFar += batch.length;
    opts.onProgress?.(embeddedSoFar, items.length, 'embeddings');

    // Save cache after each batch for resumability
    saveCache(results);

    // Delay between batches (skip after last)
    if (i + opts.batchSize < toEmbed.length) {
      await sleep(opts.delayMs);
    }
  }

  saveCache(results);
  return results;
}
