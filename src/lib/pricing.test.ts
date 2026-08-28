import { describe, expect, it } from 'vitest'
import { estimateTokensFromText, estimateOutputTokens } from './estimateTokens'
import { calcModelCost, convertAmount } from './pricing'
import type { Model } from '../types'
import { UNIT_PER_MILLION } from '../types'

const sample: Model = {
  id: 't',
  providerId: 'openai',
  name: 'T',
  nameZh: 'T',
  pricing: {
    currency: 'USD',
    unit: UNIT_PER_MILLION,
    input: 1,
    output: 2,
    cachedInput: 0.5,
    batch: { input: 0.4, output: 0.8 },
    thinking: { output: 3 },
    longContext: { thresholdTokens: 1000, input: 2, output: 4 },
  },
  flags: { supportsBatch: true, supportsCache: true, supportsThinking: true },
  updatedAt: '2026-08-01',
}

describe('estimateTokensFromText', () => {
  it('returns 0 for empty', () => {
    expect(estimateTokensFromText('')).toBe(0)
  })

  it('counts Chinese text', () => {
    expect(estimateTokensFromText('你好世界')).toBeGreaterThan(0)
  })
})

describe('estimateOutputTokens', () => {
  it('applies ratio with minimum 1', () => {
    expect(estimateOutputTokens(100, 0.05)).toBe(5)
    expect(estimateOutputTokens(1, 0.05)).toBe(1)
  })
})

describe('pricing', () => {
  const baseOpts = {
    useBatch: false,
    useThinking: false,
    usePeakHours: false,
  }

  it('splits uncached and cached input', () => {
    // Below long-context threshold: 600 uncached @ 1 + 400 cached @ 0.5
    const c = calcModelCost(sample, 600, 400, 0, 0, baseOpts)
    expect(c.inputCostNative).toBeCloseTo(0.0008, 8)
    expect(c.cachedTokens).toBe(400)
    expect(c.uncachedTokens).toBe(600)
  })

  it('bills cached at input rate when model has no cache price', () => {
    const noCache: Model = {
      ...sample,
      pricing: { ...sample.pricing, cachedInput: undefined },
      flags: { supportsBatch: true, supportsThinking: true },
    }
    const c = calcModelCost(noCache, 500, 500, 0, 0, baseOpts)
    expect(c.inputCostNative).toBeCloseTo(0.001, 8)
  })

  it('batch overrides cache', () => {
    const c = calcModelCost(sample, 500_000, 500_000, 1_000_000, 0, {
      ...baseOpts,
      useBatch: true,
    })
    expect(c.inputCostNative).toBe(0.4)
    expect(c.outputCostNative).toBe(0.8)
  })

  it('applies long context tier on total input', () => {
    const c = calcModelCost(sample, 1500, 600, 0, 0, baseOpts)
    expect(c.usedLongContext).toBe(true)
    expect(c.inputRate).toBe(2)
  })

  it('splits thinking tokens', () => {
    const c = calcModelCost(sample, 0, 0, 1000, 400, {
      ...baseOpts,
      useThinking: true,
    })
    expect(c.outputCostNative).toBeCloseTo(0.0024, 8)
  })

  it('applies DeepSeek off-peak half price by default', () => {
    const deepseek: Model = {
      id: 'ds',
      providerId: 'deepseek',
      name: 'Flash',
      nameZh: 'Flash',
      pricing: {
        currency: 'CNY',
        unit: UNIT_PER_MILLION,
        input: 3,
        output: 9,
        cachedInput: 0.1,
        offPeakMultiplier: 0.5,
      },
      flags: { supportsCache: true, supportsOffPeak: true },
      updatedAt: '2026-08-28',
    }
    const idle = calcModelCost(deepseek, 1_000_000, 0, 1_000_000, 0, baseOpts)
    expect(idle.inputRate).toBe(1.5)
    expect(idle.outputRate).toBe(4.5)
    expect(idle.totalNative).toBe(6)

    const peak = calcModelCost(deepseek, 1_000_000, 0, 1_000_000, 0, {
      ...baseOpts,
      usePeakHours: true,
    })
    expect(peak.inputRate).toBe(3)
    expect(peak.outputRate).toBe(9)
    expect(peak.totalNative).toBe(12)
  })

  it('converts USD to CNY', () => {
    expect(convertAmount(2, 'USD', 'CNY', 7)).toBe(14)
  })
})
