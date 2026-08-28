import type { CostBreakdown, Model, MoneyCurrency, PricingOptions } from '../types'
import { UNIT_PER_MILLION } from '../types'

/**
 * Batch replaces standard input/output rates.
 * When batch is on, cache toggle is ignored (v1 explicit rule).
 * Long-context tier only swaps base input/output; cache/batch on long tier is out of scope.
 * Listed input/output/cachedInput are peak rates when offPeakMultiplier is set;
 * idle/off-peak = peak × offPeakMultiplier unless usePeakHours is on.
 */
export function resolveRates(
  model: Model,
  inputTokens: number,
  options: PricingOptions,
): { inputRate: number; outputRate: number; thinkingRate?: number; usedLongContext: boolean } {
  const p = model.pricing
  let inputRate = p.input
  let outputRate = p.output
  let cachedRate = p.cachedInput
  let usedLongContext = false

  if (p.longContext && inputTokens > p.longContext.thresholdTokens) {
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
  } else if (options.useCache && cachedRate != null && model.flags?.supportsCache) {
    inputRate = cachedRate
  }

  let thinkingRate =
    options.useThinking && p.thinking && model.flags?.supportsThinking
      ? p.thinking.output
      : undefined
  if (thinkingRate != null && applyOffPeak) {
    thinkingRate *= p.offPeakMultiplier!
  }

  return { inputRate, outputRate, thinkingRate, usedLongContext }
}

export function calcModelCost(
  model: Model,
  inputTokens: number,
  outputTokens: number,
  thinkingTokens: number,
  options: PricingOptions,
): CostBreakdown {
  const { inputRate, outputRate, thinkingRate, usedLongContext } = resolveRates(
    model,
    inputTokens,
    options,
  )

  const unit = model.pricing.unit ?? UNIT_PER_MILLION
  const inputCostNative = (inputTokens / unit) * inputRate

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
