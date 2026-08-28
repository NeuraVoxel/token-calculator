import type { CurrencyDisplay, PricingOptions } from '../types'
import { providers } from '../data/providers'

type Props = {
  currencyDisplay: CurrencyDisplay
  onCurrencyDisplayChange: (v: CurrencyDisplay) => void
  options: PricingOptions
  onOptionsChange: (next: PricingOptions) => void
  selectedProviders: Set<string>
  onToggleProvider: (id: string) => void
}

const CURRENCIES: { id: CurrencyDisplay; label: string }[] = [
  { id: 'CNY', label: '人民币' },
  { id: 'USD', label: '美元' },
  { id: 'both', label: '双显' },
]

export function OptionsBar({
  currencyDisplay,
  onCurrencyDisplayChange,
  options,
  onOptionsChange,
  selectedProviders,
  onToggleProvider,
}: Props) {
  return (
    <section className="panel" aria-labelledby="options-heading">
      <div className="panel-head">
        <h2 id="options-heading" className="panel-title">
          选项
        </h2>
      </div>

      <div className="options-block">
        <span className="label">币种显示</span>
        <div className="segment" role="group" aria-label="币种显示">
          {CURRENCIES.map((c) => (
            <button
              key={c.id}
              type="button"
              className={currencyDisplay === c.id ? 'seg is-active' : 'seg'}
              onClick={() => onCurrencyDisplayChange(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="options-block">
        <span className="label">计价开关</span>
        <div className="toggle-row">
          {(
            [
              ['useCache', '缓存价'],
              ['useBatch', 'Batch'],
              ['useThinking', 'Thinking'],
              ['usePeakHours', '高峰时段'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="toggle">
              <input
                type="checkbox"
                checked={options[key]}
                onChange={(e) => onOptionsChange({ ...options, [key]: e.target.checked })}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="options-block">
        <span className="label">厂商</span>
        <div className="provider-filters">
          {providers.map((p) => {
            const on = selectedProviders.has(p.id)
            return (
              <button
                key={p.id}
                type="button"
                className={on ? 'filter-chip is-on' : 'filter-chip'}
                aria-pressed={on}
                onClick={() => onToggleProvider(p.id)}
              >
                {p.nameZh}
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
