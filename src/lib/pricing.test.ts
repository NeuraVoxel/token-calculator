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
    useCache: false,
    useBatch: false,
    useThinking: false,
    usePeakHours: false,
  }

  it('uses cache when enabled', () => {
    const c = calcModelCost(sample, 1_000_000, 0, 0, {
      ...baseOpts,
      useCache: true,
    })
    expect(c.inputCostNative).toBe(0.5)
  })

  it('batch overrides cache', () => {
    const c = calcModelCost(sample, 1_000_000, 1_000_000, 0, {
      ...baseOpts,
      useCache: true,
      useBatch: true,
    })
    expect(c.inputCostNative).toBe(0.4)
    expect(c.outputCostNative).toBe(0.8)
  })

  it('applies long context tier', () => {
    const c = calcModelCost(sample, 2000, 0, 0, baseOpts)
    expect(c.usedLongContext).toBe(true)
    expect(c.inputRate).toBe(2)
  })

  it('splits thinking tokens', () => {
    const c = calcModelCost(sample, 0, 1000, 400, {
      ...baseOpts,
      useThinking: true,
    })
    // 600 * 2 / 1e6 + 400 * 3 / 1e6
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
    const idle = calcModelCost(deepseek, 1_000_000, 1_000_000, 0, baseOpts)
    expect(idle.inputRate).toBe(1.5)
    expect(idle.outputRate).toBe(4.5)
    expect(idle.totalNative).toBe(6)

    const peak = calcModelCost(deepseek, 1_000_000, 1_000_000, 0, {
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
