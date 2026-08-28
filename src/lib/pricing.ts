import type { CostBreakdown, Model, MoneyCurrency, PricingOptions } from '../types'
import { UNIT_PER_MILLION } from '../types'

/**
 * Batch replaces standard input/output rates (cache rates ignored under batch).
 * Long-context tier only swaps base input/output.
 * Listed input/output/cachedInput are peak rates when offPeakMultiplier is set;
 * idle/off-peak = peak × offPeakMultiplier unless usePeakHours is on.
 * Cache discount applies whenever cachedTokens > 0 and the model lists cachedInput.
 */
export function resolveRates(
  model: Model,
  totalInputTokens: number,
  options: PricingOptions,
): {
  inputRate: number
  cachedRate?: number
  outputRate: number
  thinkingRate?: number
  usedLongContext: boolean
} {
  const p = model.pricing
  let inputRate = p.input
  let outputRate = p.output
  let cachedRate = p.cachedInput
  let usedLongContext = false

  if (p.longContext && totalInputTokens > p.longContext.thresholdTokens) {
    inputRate = p.longContext.input
    outputRate = p.longContext.output
    usedLongContext = true
  }

  const applyOffPeak =
    model.flags?.supportsOffPeak &&
    p.offPeakMultiplier != null &&
    !options.usePeakHours

  if (applyOffPeak) {
    const m = p.offPeakMultiplier!
    inputRate *= m
    outputRate *= m
    if (cachedRate != null) cachedRate *= m
  }

  if (options.useBatch && p.batch && model.flags?.supportsBatch) {
    inputRate = p.batch.input
    outputRate = p.batch.output
    if (applyOffPeak) {
      inputRate *= p.offPeakMultiplier!
      outputRate *= p.offPeakMultiplier!
    }
    cachedRate = undefined
  } else if (cachedRate == null || !model.flags?.supportsCache) {
    cachedRate = undefined
  }

  let thinkingRate =
    options.useThinking && p.thinking && model.flags?.supportsThinking
      ? p.thinking.output
      : undefined
  if (thinkingRate != null && applyOffPeak) {
    thinkingRate *= p.offPeakMultiplier!
  }

  return { inputRate, cachedRate, outputRate, thinkingRate, usedLongContext }
}

export function calcModelCost(
  model: Model,
  uncachedTokens: number,
  cachedTokens: number,
  outputTokens: number,
  thinkingTokens: number,
  options: PricingOptions,
): CostBreakdown {
  const uncached = Math.max(0, uncachedTokens)
  const cachedIn = Math.max(0, cachedTokens)
  const totalInput = uncached + cachedIn

  const { inputRate, cachedRate, outputRate, thinkingRate, usedLongContext } = resolveRates(
    model,
    totalInput,
    options,
  )

  const unit = model.pricing.unit ?? UNIT_PER_MILLION
  // Models without cache pricing bill "缓存读取" at the normal input rate.
  const effectiveCachedRate = cachedRate ?? inputRate
  const inputCostNative =
    (uncached / unit) * inputRate + (cachedIn / unit) * effectiveCachedRate

  const think = thinkingRate != null ? Math.min(Math.max(0, thinkingTokens), outputTokens) : 0
  const normalOut = outputTokens - think
  const outputCostNative =
    (normalOut / unit) * outputRate + (think / unit) * (thinkingRate ?? outputRate)

  return {
    model,
    inputCostNative,
    outputCostNative,
    totalNative: inputCostNative + outputCostNative,
    currency: model.pricing.currency,
    usedLongContext,
    inputRate,
    outputRate,
    cachedRate: cachedRate ?? (cachedIn > 0 ? inputRate : undefined),
    cachedTokens: cachedIn,
    uncachedTokens: uncached,
  }
}

/** Convert an amount in `from` into `to` given usdToCny rate. */
export function convertAmount(
  amount: number,
  from: MoneyCurrency,
  to: MoneyCurrency,
  usdToCny: number,
): number {
  if (from === to) return amount
  if (from === 'USD' && to === 'CNY') return amount * usdToCny
  return amount / usdToCny
}

export function toUsd(amount: number, currency: MoneyCurrency, usdToCny: number): number {
  return convertAmount(amount, currency, 'USD', usdToCny)
}

export function toCny(amount: number, currency: MoneyCurrency, usdToCny: number): number {
  return convertAmount(amount, currency, 'CNY', usdToCny)
}
