export type MoneyCurrency = 'USD' | 'CNY'

export type Provider = {
  id: string
  name: string
  nameZh: string
  website: string
}

export type ModelPricing = {
  currency: MoneyCurrency
  unit: typeof UNIT_PER_MILLION
  /** Standard / peak-hour rates (per 1M tokens). */
  input: number
  output: number
  cachedInput?: number
  /**
   * When set (e.g. 0.5 for DeepSeek), non-peak rates = peak × multiplier.
   * `input` / `output` / `cachedInput` store the peak (full) list prices.
   */
  offPeakMultiplier?: number
  longContext?: {
    thresholdTokens: number
    input: number
    output: number
  }
  batch?: { input: number; output: number }
  thinking?: { output: number }
}

export const UNIT_PER_MILLION = 1_000_000 as const

export type Model = {
  id: string
  providerId: string
  name: string
  nameZh: string
  contextWindow?: number
  pricing: ModelPricing
  flags?: {
    supportsBatch?: boolean
    supportsCache?: boolean
    supportsThinking?: boolean
    supportsOffPeak?: boolean
  }
  notes?: string
  updatedAt: string
}

export type InputMode = 'text' | 'words' | 'tokens'
export type CurrencyDisplay = 'USD' | 'CNY' | 'both'
export type ScenarioId = 'classify' | 'rag' | 'chat' | 'full' | 'long'

export type PricingOptions = {
  useCache: boolean
  useBatch: boolean
  useThinking: boolean
  /** When true, use peak list prices; when false, apply offPeakMultiplier if present. */
  usePeakHours: boolean
}

export type CostBreakdown = {
  model: Model
  inputCostNative: number
  outputCostNative: number
  totalNative: number
  currency: MoneyCurrency
  usedLongContext: boolean
  inputRate: number
  outputRate: number
  cachedRate?: number
  cachedTokens?: number
}
