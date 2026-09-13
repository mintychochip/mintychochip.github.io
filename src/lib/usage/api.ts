/// <reference lib="dom" />

export type Metric = 'input_tokens' | 'output_tokens' | 'total_tokens' | 'estimated_cost_usd';
export const METRICS: readonly Metric[] = ['input_tokens', 'output_tokens', 'total_tokens', 'estimated_cost_usd'];
export type RangeKey = '7d' | '30d' | '90d' | '1y';
export const RANGE_DAYS: Record<RangeKey, number> = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };

export interface FetchOpts { cache?: RequestCache; signal?: AbortSignal; }

export interface ModelUse {
  model: string; provider: string | null; name: string; variant: string | null;
  input_tokens: number; output_tokens: number; total_tokens: number; estimated_cost_usd: number | null;
}

export interface ModelsPoint { date: string; models: ModelUse[]; }

export interface ModelsResponse {
  schema_version: 1; from: string; to: string; models: ModelUse[]; points: ModelsPoint[];
}

export type CustomMetricPoint = { date: string; metric: Metric; value: number | null; harness: string | null };

export type CustomPoint = { date: string } & Partial<Record<Metric, number | null>>;

export interface SeriesResponse {
  schema_version: 1; from: string; to: string;
  metrics: string[]; harnesses: string[] | null;
  points: CustomPoint[];
}

const CACHE_CAPACITY = 64;
const cache = new Map<string, { value: unknown; expires: number }>();
const inFlight = new Map<string, Promise<unknown>>();

function isISODate(s: unknown): s is string {
  if (typeof s !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toISOString().slice(0, 10) === s;
}

function shiftDate(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() - n);
  return date.toISOString().slice(0, 10);
}

export function rangeToDates(range: RangeKey, today = new Date()): { from: string; to: string } {
  const to = today.toISOString().slice(0, 10);
  const from = shiftDate(to, RANGE_DAYS[range] - 1);
  return { from, to };
}

function cacheKey(cacheMode: string, url: string): string {
  return `${cacheMode}:${url}`;
}

function getCached(key: string): unknown | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expires) {
    cache.delete(key);
    return undefined;
  }
  cache.delete(key);
  cache.set(key, entry);
  return entry.value;
}

function setCached(key: string, value: unknown, ttl: number): void {
  if (ttl <= 0) return;
  if (!cache.has(key) && cache.size >= CACHE_CAPACITY) {
    const first = cache.keys().next().value;
    if (first !== undefined) cache.delete(first as string);
  }
  cache.set(key, { value, expires: Date.now() + ttl });
}

function parseTTL(headers: Headers): number {
  const cc = headers.get('cache-control') ?? '';
  if (cc.includes('no-store')) return 0;
  const match = cc.match(/max-age=(\d+)/);
  if (!match) return 0;
  const maxAge = parseInt(match[1], 10);
  return Math.min(maxAge * 1000, 60_000);
}

function abortError(): DOMException | Error {
  if (typeof DOMException !== 'undefined') {
    return new DOMException('The operation was aborted.', 'AbortError');
  }
  const e = new Error('The operation was aborted.');
  e.name = 'AbortError';
  return e;
}

export function isAbortError(e: unknown): boolean {
  if (typeof DOMException !== 'undefined' && e instanceof DOMException) {
    return e.name === 'AbortError';
  }
  return e instanceof Error && e.name === 'AbortError';
}

function withSignal<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(abortError());
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      signal.addEventListener('abort', () => reject(abortError()), { once: true });
    }),
  ]);
}

async function tryFetch(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (e) {
    if (init.cache !== undefined && e instanceof Error && /cache/i.test(e.message)) {
      const { cache: _, ...rest } = init;
      return await fetch(url, rest);
    }
    throw e;
  }
}

async function inFlightFetch(url: string, cacheMode: RequestCache, signal?: AbortSignal): Promise<{ json: unknown; headers: Headers }> {
  if (signal?.aborted) throw abortError();
  const key = cacheKey(cacheMode, url);
  const existing = inFlight.get(key);
  if (existing) return existing as Promise<{ json: unknown; headers: Headers }>;
  const p = (async () => {
    const res = await tryFetch(url, { cache: cacheMode, signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const headers = res.headers;
    const json = await res.json();
    return { json, headers };
  })().finally(() => { inFlight.delete(key); });
  inFlight.set(key, p);
  return p;
}

function buildURL(kind: 'models' | 'series', from: string, to: string, metrics?: readonly Metric[]): URL {
  const url = new URL(`v1/usage/${kind}`, `${location.origin}/`);
  url.searchParams.set('from', from);
  url.searchParams.set('to', to);
  if (metrics) url.searchParams.set('metrics', metrics.join(','));
  return url;
}

function validateModels(json: unknown): ModelsResponse {
  if (typeof json !== 'object' || json === null) throw new Error('expected an object');
  const allowed: Record<string, true> = { schema_version: true, from: true, to: true, models: true, points: true };
  for (const key of Object.keys(json)) {
    if (!allowed[key]) throw new Error(`unexpected property ${key}`);
  }
  const obj = json as Record<string, unknown>;
  if (obj.schema_version !== 1) throw new Error('invalid schema_version');
  if (!isISODate(obj.from)) throw new Error('from/to must be ISO dates');
  if (!isISODate(obj.to)) throw new Error('from/to must be ISO dates');
  if (!Array.isArray(obj.models)) throw new Error('models must be an array');
  if (!Array.isArray(obj.points)) throw new Error('points must be an array');

  const modelNames = new Set<string>();
  const models: ModelUse[] = [];
  for (const raw of obj.models as unknown[]) {
    if (typeof raw !== 'object' || raw === null) throw new Error('models entries must be objects');
    const allowedM: Record<string, true> = { model: true, provider: true, name: true, variant: true, input_tokens: true, output_tokens: true, total_tokens: true, estimated_cost_usd: true };
    for (const key of Object.keys(raw)) {
      if (!allowedM[key]) throw new Error(`unexpected property ${key}`);
    }
    const m = raw as Record<string, unknown>;
    if (typeof m.model !== 'string' || m.model.length === 0) throw new Error('model must be a non-empty string');
    if (m.provider !== undefined && m.provider !== null && typeof m.provider !== 'string') {
      throw new Error('provider must be a string or null');
    }
    if (m.variant !== undefined && m.variant !== null && typeof m.variant !== 'string') {
      throw new Error('variant must be a string or null');
    }
    if (typeof m.input_tokens !== 'number' || !Number.isFinite(m.input_tokens) || m.input_tokens < 0) {
      throw new Error('input_tokens must be a finite non-negative number');
    }
    if (typeof m.output_tokens !== 'number' || !Number.isFinite(m.output_tokens) || m.output_tokens < 0) {
      throw new Error('output_tokens must be a finite non-negative number');
    }
    if (typeof m.total_tokens !== 'number' || !Number.isFinite(m.total_tokens) || m.total_tokens < 0) {
      throw new Error('total_tokens must be a finite non-negative number');
    }
    if (m.estimated_cost_usd !== undefined && m.estimated_cost_usd !== null) {
      if (typeof m.estimated_cost_usd !== 'number' || !Number.isFinite(m.estimated_cost_usd) || m.estimated_cost_usd < 0) {
        throw new Error('estimated_cost_usd must be a finite non-negative number or null');
      }
    }
    const name = (typeof m.name === 'string' && m.name.length > 0) ? m.name : m.model;
    modelNames.add(m.model);
    models.push({
      model: m.model,
      provider: m.provider === undefined ? null : m.provider as string | null,
      name,
      variant: m.variant === undefined ? null : m.variant as string | null,
      input_tokens: m.input_tokens,
      output_tokens: m.output_tokens,
      total_tokens: m.total_tokens,
      estimated_cost_usd: m.estimated_cost_usd === undefined ? null : m.estimated_cost_usd as number | null,
    });
  }

  const points: ModelsPoint[] = [];
  for (const raw of obj.points as unknown[]) {
    if (typeof raw !== 'object' || raw === null) throw new Error('points entries must be objects');
    const allowedP: Record<string, true> = { date: true, models: true };
    for (const key of Object.keys(raw)) {
      if (!allowedP[key]) throw new Error(`unexpected property ${key}`);
    }
    const p = raw as Record<string, unknown>;
    if (!isISODate(p.date)) throw new Error('point date must be an ISO date');
    if (!Array.isArray(p.models)) throw new Error('point models must be an array');
    for (const seg of p.models as unknown[]) {
      if (typeof seg !== 'object' || seg === null) throw new Error('point model segments must be objects');
      const s = seg as Record<string, unknown>;
      if (typeof s.model !== 'string' || s.model.length === 0) throw new Error('segment model must be a non-empty string');
      if (!modelNames.has(s.model)) throw new Error('segment model missing from legend');
    }
    points.push({ date: p.date as string, models: p.models as ModelUse[] });
  }

  return {
    schema_version: 1,
    from: obj.from as string,
    to: obj.to as string,
    models,
    points,
  };
}

function validateSeries(json: unknown, requestedMetrics: readonly Metric[]): SeriesResponse {
  if (typeof json !== 'object' || json === null) throw new Error('expected an object');
  const allowed: Record<string, true> = { schema_version: true, from: true, to: true, metrics: true, harnesses: true, points: true };
  for (const key of Object.keys(json)) {
    if (!allowed[key]) throw new Error(`unexpected property ${key}`);
  }
  const obj = json as Record<string, unknown>;
  if (obj.schema_version !== 1) throw new Error('invalid schema_version');
  if (!isISODate(obj.from)) throw new Error('from/to must be ISO dates');
  if (!isISODate(obj.to)) throw new Error('from/to must be ISO dates');
  if (obj.harnesses !== null && !Array.isArray(obj.harnesses)) throw new Error('harnesses must be null or an array of strings');
  if (obj.harnesses !== null) {
    for (const h of obj.harnesses as unknown[]) {
      if (typeof h !== 'string') throw new Error('harnesses must be null or an array of strings');
    }
  }
  if (!Array.isArray(obj.metrics)) throw new Error('metrics must be an array');
  for (const m of obj.metrics as unknown[]) {
    if (!METRICS.includes(m as Metric)) throw new Error('unknown metric');
  }
  if (!Array.isArray(obj.points)) throw new Error('points must be an array');

  const points: CustomPoint[] = [];
  for (const raw of obj.points as unknown[]) {
    if (typeof raw !== 'object' || raw === null) throw new Error('points entries must be objects');
    const allowedP = new Set(['date', ...requestedMetrics]);
    for (const key of Object.keys(raw)) {
      if (!allowedP.has(key)) throw new Error(`unexpected property ${key}`);
    }
    const p = raw as Record<string, unknown>;
    if (!isISODate(p.date)) throw new Error('point date must be an ISO date');
    for (const m of requestedMetrics) {
      const v = p[m];
      if (m === 'estimated_cost_usd') {
        if (v !== null && (typeof v !== 'number' || !Number.isFinite(v) || v < 0)) {
          throw new Error('estimated_cost_usd must be a finite non-negative number or null');
        }
      } else {
        if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) {
          throw new Error(`${m} must be a finite non-negative number`);
        }
      }
    }
    points.push(p as CustomPoint);
  }

  return {
    schema_version: 1,
    from: obj.from as string,
    to: obj.to as string,
    metrics: obj.metrics as string[],
    harnesses: obj.harnesses as string[] | null,
    points,
  };
}

export async function fetchModels(from: string, to: string, opts = {} as FetchOpts): Promise<ModelsResponse> {
  const cacheMode = opts.cache ?? 'default';
  const url = buildURL('models', from, to).href;
  const signal = opts.signal;
  const key = cacheKey(cacheMode, url);
  const cached = getCached(key);
  if (cached !== undefined) return withSignal(Promise.resolve(cached as ModelsResponse), signal);
  let res: { json: unknown; headers: Headers };
  try {
    res = await inFlightFetch(url, cacheMode, signal);
  } catch (e) {
    if (isAbortError(e)) throw e;
    res = await inFlightFetch(url, 'no-store', signal);
  }
  const validated = validateModels(res.json);
  if (cacheMode !== 'no-store') {
    const ttl = parseTTL(res.headers);
    setCached(key, validated, ttl);
  }
  return withSignal(Promise.resolve(validated), signal);
}

export async function fetchSeries(from: string, to: string, metrics: readonly Metric[], opts = {} as FetchOpts): Promise<SeriesResponse> {
  const cacheMode = opts.cache ?? 'default';
  const url = buildURL('series', from, to, metrics).href;
  const signal = opts.signal;
  const key = cacheKey(cacheMode, url);
  const cached = getCached(key);
  if (cached !== undefined) return withSignal(Promise.resolve(cached as SeriesResponse), signal);
  let res: { json: unknown; headers: Headers };
  try {
    res = await inFlightFetch(url, cacheMode, signal);
  } catch (e) {
    if (isAbortError(e)) throw e;
    res = await inFlightFetch(url, 'no-store', signal);
  }
  const validated = validateSeries(res.json, metrics);
  if (cacheMode !== 'no-store') {
    const ttl = parseTTL(res.headers);
    setCached(key, validated, ttl);
  }
  return withSignal(Promise.resolve(validated), signal);
}
