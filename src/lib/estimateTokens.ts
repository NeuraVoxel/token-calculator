/** Tunable heuristics — not official tokenizers. */
export const CN_CHARS_PER_TOKEN = 1.2
export const EN_WORDS_PER_TOKEN = 1.3

export function countStats(text: string): {
  chars: number
  words: number
  cnChars: number
  enWords: number
} {
  const chars = [...text].length
  const cnChars = (text.match(/[\u4e00-\u9fff]/g) ?? []).join('').length
  const latin = text.replace(/[\u4e00-\u9fff]/g, ' ')
  const enWords = latin.trim() === '' ? 0 : latin.trim().split(/\s+/).filter(Boolean).length
  const words = enWords + cnChars
  return { chars, words, cnChars, enWords }
}

export function estimateTokensFromText(text: string): number {
  if (!text) return 0
  const { cnChars, enWords } = countStats(text)
  const tokens = cnChars / CN_CHARS_PER_TOKEN + enWords * EN_WORDS_PER_TOKEN
  return Math.max(0, Math.round(tokens))
}

/** Word count field: treat as mixed; prefer Chinese-char heuristic when count is large integers typed as 字数. */
export function estimateTokensFromWordCount(wordCount: number): number {
  if (!Number.isFinite(wordCount) || wordCount <= 0) return 0
  return Math.max(1, Math.round(wordCount * EN_WORDS_PER_TOKEN))
}

export const SCENARIO_RATIOS = {
  classify: 0.05,
  rag: 0.25,
  chat: 0.5,
  full: 1.0,
  long: 2.0,
} as const

export function estimateOutputTokens(inputTokens: number, ratio: number): number {
  if (inputTokens <= 0) return 0
  return Math.max(1, Math.round(inputTokens * ratio))
}
