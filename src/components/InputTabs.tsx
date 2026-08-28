import type { InputMode } from '../types'
import { countStats, estimateTokensFromText } from '../lib/estimateTokens'

type Props = {
  mode: InputMode
  onModeChange: (mode: InputMode) => void
  text: string
  onTextChange: (v: string) => void
  wordCount: string
  onWordCountChange: (v: string) => void
  tokenCount: string
  onTokenCountChange: (v: string) => void
  estimatedInputTokens: number
}

const TABS: { id: InputMode; label: string }[] = [
  { id: 'text', label: '文本' },
  { id: 'words', label: '词数' },
  { id: 'tokens', label: 'Token 数' },
]

export function InputTabs({
  mode,
  onModeChange,
  text,
  onTextChange,
  wordCount,
  onWordCountChange,
  tokenCount,
  onTokenCountChange,
  estimatedInputTokens,
}: Props) {
  const stats = countStats(text)
  const largeText = text.length > 100_000

  return (
    <section className="panel" aria-labelledby="input-heading">
      <div className="panel-head">
        <h2 id="input-heading" className="panel-title">
          输入
        </h2>
        <div className="tabs" role="tablist" aria-label="输入方式">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={mode === tab.id}
              className={mode === tab.id ? 'tab is-active' : 'tab'}
              onClick={() => onModeChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {mode === 'text' && (
        <div className="field-stack">
          <label className="sr-only" htmlFor="input-text">
            粘贴或输入文本
          </label>
          <textarea
            id="input-text"
            className="textarea"
            rows={6}
            placeholder="粘贴提示词、文档或对话内容…"
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
          />
          <div className="meta-row">
            <span>
              {stats.chars.toLocaleString()} 字符 · {stats.words.toLocaleString()} 词/字 · 估{' '}
              <strong className="num">{estimateTokensFromText(text).toLocaleString()}</strong> tokens
            </span>
            {largeText && <span className="hint warn">文本较大，估算可能较慢</span>}
          </div>
        </div>
      )}

      {mode === 'words' && (
        <div className="field-stack">
          <label className="label" htmlFor="input-words">
            词数 / 字数
          </label>
          <input
            id="input-words"
            className="input num-input"
            inputMode="numeric"
            placeholder="例如 1200"
            value={wordCount}
            onChange={(e) => onWordCountChange(e.target.value)}
          />
          <p className="meta-row">
            估算 input ≈ <strong className="num">{estimatedInputTokens.toLocaleString()}</strong> tokens
          </p>
        </div>
      )}

      {mode === 'tokens' && (
        <div className="field-stack">
          <label className="label" htmlFor="input-tokens">
            Input tokens
          </label>
          <input
            id="input-tokens"
            className="input num-input"
            inputMode="numeric"
            placeholder="例如 8000"
            value={tokenCount}
            onChange={(e) => onTokenCountChange(e.target.value)}
          />
        </div>
      )}

      <p className="disclaimer">
        Token 估算为启发式近似，并非各模型官方 tokenizer。中文约 1.2 字/token，英文约 1.3
        token/词。
      </p>
    </section>
  )
}
