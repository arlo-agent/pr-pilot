import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { resolve } from 'path';

export async function GET() {
  const dataPath = process.env.PR_PILOT_DATA_PATH || resolve(process.cwd(), '../../.pr-pilot-state.json');
  try {
    const raw = await readFile(dataPath, 'utf-8');
    const data = JSON.parse(raw);
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Failed to load data from ${dataPath}: ${message}` }, { status: 500 });
  }
}
