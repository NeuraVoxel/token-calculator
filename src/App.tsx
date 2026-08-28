import { useEffect, useMemo, useState } from 'react'
import { InputTabs } from './components/InputTabs'
import { OutputControls } from './components/OutputControls'
import { OptionsBar } from './components/OptionsBar'
import { QuoteStrip } from './components/QuoteStrip'
import { ResultsTable } from './components/ResultsTable'
import { models } from './data/providers'
import {
  estimateOutputTokens,
  estimateTokensFromText,
  estimateTokensFromWordCount,
  SCENARIO_RATIOS,
} from './lib/estimateTokens'
import { loadFxRate, FALLBACK_USD_TO_CNY } from './lib/fx'
import { calcModelCost, toCny, toUsd } from './lib/pricing'
import type {
  CurrencyDisplay,
  InputMode,
  PricingOptions,
  ScenarioId,
} from './types'

/** Accepts 8000 / 8,000 / 8，000 / fullwidth digits. */
function parseNonNeg(raw: string): number | null {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  const normalized = trimmed
    .replace(/[\uFF10-\uFF19]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xff10 + 0x30))
    .replace(/[,，\s]/g, '')
  if (normalized === '') return null
  const n = Number(normalized)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

export default function App() {
  const [mode, setMode] = useState<InputMode>('tokens')
  const [text, setText] = useState('')
  const [wordCount, setWordCount] = useState('')
  const [tokenCount, setTokenCount] = useState('')
  const [scenario, setScenario] = useState<ScenarioId>('full')
  const [outputTokens, setOutputTokens] = useState('0')
  const [isCustomOutput, setIsCustomOutput] = useState(false)
  const [thinkingTokens, setThinkingTokens] = useState('0')
  const [cachedTokens, setCachedTokens] = useState('0')
  const [currencyDisplay, setCurrencyDisplay] = useState<CurrencyDisplay>('CNY')
  const [options, setOptions] = useState<PricingOptions>({
    useCache: false,
    useBatch: false,
    useThinking: false,
    usePeakHours: false,
  })
  const [selectedProviders, setSelectedProviders] = useState<Set<string>>(
    () => new Set(['deepseek']),
  )
  const [usdToCny, setUsdToCny] = useState(FALLBACK_USD_TO_CNY)
  const [fxSource, setFxSource] = useState<'api' | 'fallback'>('fallback')

  useEffect(() => {
    let cancelled = false
    loadFxRate().then((fx) => {
      if (cancelled) return
      setUsdToCny(fx.usdToCny)
      setFxSource(fx.source)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const inputTokens = useMemo(() => {
    if (mode === 'text') return estimateTokensFromText(text)
    if (mode === 'words') {
      const w = parseNonNeg(wordCount)
      if (w == null) return null
      return estimateTokensFromWordCount(w)
    }
    return parseNonNeg(tokenCount)
  }, [mode, text, wordCount, tokenCount])

  const scenarioOutput =
    inputTokens != null && inputTokens > 0
      ? estimateOutputTokens(inputTokens, SCENARIO_RATIOS[scenario])
      : 0

  // Keep the output field in sync with scenario unless the user customized it.
  useEffect(() => {
    if (isCustomOutput) return
    setOutputTokens(String(scenarioOutput))
  }, [scenarioOutput, isCustomOutput])

  const customOutputParsed = parseNonNeg(outputTokens)
  // Prefer custom value when valid; otherwise fall back to scenario estimate so
  // clearing the output field (or leaving it empty) still yields a comparison.
  const effectiveOutputTokens =
    isCustomOutput && customOutputParsed != null ? customOutputParsed : scenarioOutput

  const thinkingParsed = parseNonNeg(thinkingTokens) ?? 0
  const cachedParsed = parseNonNeg(cachedTokens) ?? 0

  const inputInvalid =
    (mode === 'words' && wordCount.trim() !== '' && parseNonNeg(wordCount) == null) ||
    (mode === 'tokens' && tokenCount.trim() !== '' && parseNonNeg(tokenCount) == null)

  const hasValidUsage = inputTokens != null && inputTokens > 0 && !inputInvalid

  const rows = useMemo(() => {
    if (!hasValidUsage || inputTokens == null) return []
    return models
      .filter((m) => selectedProviders.has(m.providerId))
      .map((m) => {
        const breakdown = calcModelCost(
          m,
          inputTokens,
          effectiveOutputTokens,
          options.useThinking ? thinkingParsed : 0,
          options.useCache ? cachedParsed : 0,
          options,
        )
        return {
          ...breakdown,
          totalUsd: toUsd(breakdown.totalNative, breakdown.currency, usdToCny),
          totalCny: toCny(breakdown.totalNative, breakdown.currency, usdToCny),
        }
      })
      .sort((a, b) => a.totalUsd - b.totalUsd)
  }, [
    hasValidUsage,
    inputTokens,
    effectiveOutputTokens,
    thinkingParsed,
    cachedParsed,
    options,
    selectedProviders,
    usdToCny,
  ])

  const cheapest = rows[0]

  function toggleProvider(id: string) {
    setSelectedProviders((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        if (next.size === 1) return next
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function handleScenarioChange(id: ScenarioId) {
    setScenario(id)
    setIsCustomOutput(false)
  }

  function handleOutputChange(v: string) {
    setOutputTokens(v)
    // Empty field → resume scenario estimate instead of blocking results.
    setIsCustomOutput(v.trim() !== '')
  }

  return (
    <div className="app">
      <div className="atmosphere" aria-hidden="true" />

      <header className="masthead">
        <div className="brand-block">
          <p className="brand">Token 计价</p>
          <p className="tagline">主流大模型 API 费用对照 · 人民币 / 美元</p>
        </div>
      </header>

      <main className="workspace">
        <InputTabs
          mode={mode}
          onModeChange={setMode}
          text={text}
          onTextChange={setText}
          wordCount={wordCount}
          onWordCountChange={setWordCount}
          tokenCount={tokenCount}
          onTokenCountChange={setTokenCount}
          estimatedInputTokens={inputTokens ?? 0}
        />

        <OutputControls
          scenario={scenario}
          onScenarioChange={handleScenarioChange}
          outputTokens={outputTokens}
          onOutputTokensChange={handleOutputChange}
          isCustomOutput={isCustomOutput}
          thinkingEnabled={options.useThinking}
          thinkingTokens={thinkingTokens}
          onThinkingTokensChange={setThinkingTokens}
          cacheEnabled={options.useCache}
          cachedTokens={cachedTokens}
          onCachedTokensChange={setCachedTokens}
        />

        <OptionsBar
          currencyDisplay={currencyDisplay}
          onCurrencyDisplayChange={setCurrencyDisplay}
          options={options}
          onOptionsChange={setOptions}
          selectedProviders={selectedProviders}
          onToggleProvider={toggleProvider}
        />

        <QuoteStrip
          hasInput={Boolean(cheapest)}
          cheapestLabel={cheapest ? cheapest.model.nameZh : ''}
          totalCny={cheapest?.totalCny ?? null}
          totalUsd={cheapest?.totalUsd ?? null}
          currencyDisplay={currencyDisplay}
          usdToCny={usdToCny}
          fxSource={fxSource}
        />

        <ResultsTable
          rows={rows}
          currencyDisplay={currencyDisplay}
          usdToCny={usdToCny}
          emptyHint={
            inputInvalid
              ? '请输入有效的非负数字。'
              : '在上方选择「Token 数」并填写 input tokens 后，将按总价从低到高排列。'
          }
        />
      </main>

      <footer className="site-foot">
        <p>价格来自公开文档整理，仅供估算。正式采购请以各厂商官网为准。</p>
      </footer>
    </div>
  )
}
