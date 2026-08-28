import type { ScenarioId } from '../types'
import { SCENARIO_RATIOS } from '../lib/estimateTokens'

type Props = {
  scenario: ScenarioId
  onScenarioChange: (id: ScenarioId) => void
  isCustomOutput: boolean
  thinkingEnabled: boolean
  thinkingTokens: string
  onThinkingTokensChange: (v: string) => void
  showScenario: boolean
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
  isCustomOutput,
  thinkingEnabled,
  thinkingTokens,
  onThinkingTokensChange,
  showScenario,
}: Props) {
  if (!showScenario && !thinkingEnabled) return null

  return (
    <section className="panel" aria-labelledby="output-heading">
      <div className="panel-head">
        <h2 id="output-heading" className="panel-title">
          输出辅助
        </h2>
        {isCustomOutput && showScenario && <span className="chip">已手改输出</span>}
      </div>

      <div className="control-grid">
        {showScenario && (
          <div className="field-stack">
            <label className="label" htmlFor="scenario">
              场景预设（估输出）
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
