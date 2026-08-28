const STORAGE_KEY = 'token-calc-fx-v1'
const TTL_MS = 6 * 60 * 60 * 1000
/** Fallback when API fails — update periodically. */
export const FALLBACK_USD_TO_CNY = 7.25

type CachePayload = {
  usdToCny: number
  fetchedAt: number
  source: 'api' | 'fallback'
}

export type FxState = {
  usdToCny: number
  source: 'api' | 'fallback'
  fetchedAt: number
}

function readCache(): CachePayload | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CachePayload
    if (!parsed?.usdToCny || !parsed.fetchedAt) return null
    if (Date.now() - parsed.fetchedAt > TTL_MS) return null
    return parsed
  } catch {
    return null
  }
}

function writeCache(payload: CachePayload) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    /* ignore quota */
  }
}

export async function loadFxRate(): Promise<FxState> {
  const cached = readCache()
  if (cached) {
    return {
      usdToCny: cached.usdToCny,
      source: cached.source,
      fetchedAt: cached.fetchedAt,
    }
  }

  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 8000)
    const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=CNY', {
      signal: ctrl.signal,
    })
    clearTimeout(timer)
    if (!res.ok) throw new Error(`FX HTTP ${res.status}`)
    const data = (await res.json()) as { rates?: { CNY?: number } }
    const rate = data.rates?.CNY
    if (!rate || !Number.isFinite(rate)) throw new Error('Invalid FX payload')
    const payload: CachePayload = {
      usdToCny: rate,
      fetchedAt: Date.now(),
      source: 'api',
    }
    writeCache(payload)
    return { usdToCny: rate, source: 'api', fetchedAt: payload.fetchedAt }
  } catch {
    const payload: CachePayload = {
      usdToCny: FALLBACK_USD_TO_CNY,
      fetchedAt: Date.now(),
      source: 'fallback',
    }
    writeCache(payload)
    return { usdToCny: FALLBACK_USD_TO_CNY, source: 'fallback', fetchedAt: payload.fetchedAt }
  }
}
