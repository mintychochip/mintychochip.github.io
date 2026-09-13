import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import {
  fetchModels,
  fetchSeries,
  rangeToDates,
  isAbortError,
  METRICS,
  RANGE_DAYS,
  type ModelsResponse,
} from './api';

describe('usage api', () => {
  let fetchMock: Mock;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('location', { origin: 'http://localhost' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('builds models URL with from/to query params', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          schema_version: 1,
          from: '2026-08-20',
          to: '2026-08-26',
          models: [],
          points: [],
        }),
        { status: 200, headers: new Headers() }
      )
    );
    await fetchModels('2026-08-20', '2026-08-26');
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost/v1/usage/models?from=2026-08-20&to=2026-08-26');
  });

  it('parses and returns a valid models response', async () => {
    const raw = {
      schema_version: 1,
      from: '2026-08-20',
      to: '2026-08-26',
      models: [
        {
          model: 'gpt-4o',
          provider: 'openai',
          variant: null,
          input_tokens: 100,
          output_tokens: 50,
          total_tokens: 150,
          estimated_cost_usd: 0.0125,
        },
      ],
      points: [
        { date: '2026-08-20', models: [{ model: 'gpt-4o' }] },
      ],
    };
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(raw), { status: 200, headers: new Headers() })
    );
    const result = await fetchModels('2026-08-20', '2026-08-26');
    expect(result).toEqual({
      schema_version: 1,
      from: '2026-08-20',
      to: '2026-08-26',
      models: [
        {
          model: 'gpt-4o',
          provider: 'openai',
          name: 'gpt-4o',
          variant: null,
          input_tokens: 100,
          output_tokens: 50,
          total_tokens: 150,
          estimated_cost_usd: 0.0125,
        },
      ],
      points: raw.points,
    } as ModelsResponse);
  });

  it('throws for an unexpected top-level property', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          schema_version: 1,
          from: '2026-08-20',
          to: '2026-08-26',
          models: [],
          points: [],
          extra: 1,
        }),
        { status: 200, headers: new Headers() }
      )
    );
    await expect(fetchModels('2026-08-20', '2026-08-26')).rejects.toThrow(
      'unexpected property extra'
    );
  });

  it('throws for an unknown metric in series response', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          schema_version: 1,
          from: '2026-08-20',
          to: '2026-08-26',
          metrics: ['not_a_metric'],
          harnesses: null,
          points: [],
        }),
        { status: 200, headers: new Headers() }
      )
    );
    await expect(
      fetchSeries('2026-08-20', '2026-08-26', ['input_tokens'])
    ).rejects.toThrow('unknown metric');
  });

  it('throws for non-ISO from/to values', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          schema_version: 1,
          from: 'not-a-date',
          to: '2026-08-26',
          models: [],
          points: [],
        }),
        { status: 200, headers: new Headers() }
      )
    );
    await expect(fetchModels('not-a-date', '2026-08-26')).rejects.toThrow(
      'from/to must be ISO dates'
    );
  });

  it('dedupes the same in-flight URL across two parallel calls', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          schema_version: 1,
          from: '2026-08-20',
          to: '2026-08-26',
          models: [],
          points: [],
        }),
        { status: 200, headers: new Headers() }
      )
    );
    await Promise.all([
      fetchModels('2026-08-20', '2026-08-26'),
      fetchModels('2026-08-20', '2026-08-26'),
    ]);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('makes two fetches for cache: no-store', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            schema_version: 1,
            from: '2026-08-20',
            to: '2026-08-26',
            models: [],
            points: [],
          }),
          { status: 200, headers: new Headers() }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            schema_version: 1,
            from: '2026-08-20',
            to: '2026-08-26',
            models: [],
            points: [],
          }),
          { status: 200, headers: new Headers() }
        )
      );
    await fetchModels('2026-08-20', '2026-08-26', { cache: 'no-store' });
    await fetchModels('2026-08-20', '2026-08-26', { cache: 'no-store' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries once with no-store on a non-abort failure', async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError('network failure'))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            schema_version: 1,
            from: '2026-08-20',
            to: '2026-08-26',
            models: [],
            points: [],
          }),
          { status: 200, headers: new Headers() }
        )
      );
    await fetchModels('2026-08-20', '2026-08-26');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('reports abort via isAbortError', async () => {
    const controller = new AbortController();
    controller.abort();
    let err: unknown;
    try {
      await fetchModels('2026-08-20', '2026-08-26', { signal: controller.signal });
    } catch (e) {
      err = e;
    }
    expect(isAbortError(err)).toBe(true);
  });

  it('rangeToDates returns from/to for the range', () => {
    const today = new Date(Date.UTC(2026, 8, 13)); // 2026-09-13
    const { from, to } = rangeToDates('7d', today);
    expect(to).toBe('2026-09-13');
    expect(from).toBe('2026-09-07');
    expect(RANGE_DAYS['7d']).toBe(7);
    expect(METRICS.length).toBe(4);
  });
});
