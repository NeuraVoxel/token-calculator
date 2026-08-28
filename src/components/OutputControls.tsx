import type { ScenarioId } from '../types'
import { SCENARIO_RATIOS } from '../lib/estimateTokens'

type Props = {
  scenario: ScenarioId
  onScenarioChange: (id: ScenarioId) => void
  outputTokens: string
  onOutputTokensChange: (v: string) => void
  isCustomOutput: boolean
  thinkingEnabled: boolean
  thinkingTokens: string
  onThinkingTokensChange: (v: string) => void
  cacheEnabled: boolean
  cachedTokens: string
  onCachedTokensChange: (v: string) => void
}

const SCENARIOS: { id: ScenarioId; label: string }[] = [
  { id: 'classify', label: '分类' },
  { id: 'rag', label: 'RAG' },
  { id: 'chat', label: '短对话' },
  { id: 'full', label: '完整回复' },
  { id: 'long', label: '长生成' },
]

export function OutputControls({
  scenario,
  onScenarioChange,
  outputTokens,
  onOutputTokensChange,
  isCustomOutput,
  thinkingEnabled,
  thinkingTokens,
  onThinkingTokensChange,
  cacheEnabled,
  cachedTokens,
  onCachedTokensChange,
}: Props) {
  return (
    <section className="panel" aria-labelledby="output-heading">
      <div className="panel-head">
        <h2 id="output-heading" className="panel-title">
          输出
        </h2>
        {isCustomOutput && <span className="chip">自定义</span>}
      </div>

      <div className="control-grid">
        <div className="field-stack">
          <label className="label" htmlFor="scenario">
            场景预设
          </label>
          <select
            id="scenario"
            className="select"
            value={scenario}
            onChange={(e) => onScenarioChange(e.target.value as ScenarioId)}
          >
            {SCENARIOS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}（×{SCENARIO_RATIOS[s.id]}）
              </option>
            ))}
          </select>
        </div>

        <div className="field-stack">
          <label className="label" htmlFor="output-tokens">
            Output tokens
          </label>
          <input
            id="output-tokens"
            className="input num-input"
            inputMode="numeric"
            value={outputTokens}
            onChange={(e) => onOutputTokensChange(e.target.value)}
          />
        </div>

        {cacheEnabled && (
          <div className="field-stack">
            <label className="label" htmlFor="cached-tokens">
              缓存命中 tokens
            </label>
            <input
              id="cached-tokens"
              className="input num-input"
              inputMode="numeric"
              placeholder="不超过 input tokens"
              value={cachedTokens}
              onChange={(e) => onCachedTokensChange(e.target.value)}
            />
            <p className="meta-row">命中部分按缓存价，其余按普通 input 价</p>
          </div>
        )}

        {thinkingEnabled && (
          <div className="field-stack">
            <label className="label" htmlFor="thinking-tokens">
              Thinking tokens
            </label>
            <input
              id="thinking-tokens"
              className="input num-input"
              inputMode="numeric"
              value={thinkingTokens}
              onChange={(e) => onThinkingTokensChange(e.target.value)}
            />
          </div>
        )}
      </div>
    </section>
  )
}
