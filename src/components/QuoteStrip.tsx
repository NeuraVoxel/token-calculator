import type { CurrencyDisplay } from '../types'

type Props = {
  hasInput: boolean
  cheapestLabel: string
  totalCny: number | null
  totalUsd: number | null
  currencyDisplay: CurrencyDisplay
  usdToCny: number
  fxSource: 'api' | 'fallback'
}

function formatMoney(n: number, currency: 'CNY' | 'USD'): string {
  const symbol = currency === 'CNY' ? '¥' : '$'
  if (n >= 1) return `${symbol}${n.toFixed(4)}`
  if (n >= 0.01) return `${symbol}${n.toFixed(6)}`
  return `${symbol}${n.toFixed(8)}`
}

export function QuoteStrip({
  hasInput,
  cheapestLabel,
  totalCny,
  totalUsd,
  currencyDisplay,
  usdToCny,
  fxSource,
}: Props) {
  return (
    <aside className="quote-strip" aria-live="polite">
      <div className="quote-label">
        <span className="quote-kicker">最低合计</span>
        <span className="quote-model">{hasInput ? cheapestLabel : '输入用量后比价'}</span>
      </div>

      <div className="quote-figures">
        {hasInput && totalCny != null && totalUsd != null ? (
          <>
            {(currencyDisplay === 'CNY' || currencyDisplay === 'both') && (
              <span className="quote-primary num">{formatMoney(totalCny, 'CNY')}</span>
            )}
            {(currencyDisplay === 'USD' || currencyDisplay === 'both') && (
              <span
                className={
                  currencyDisplay === 'USD' ? 'quote-primary num' : 'quote-secondary num'
                }
              >
                {formatMoney(totalUsd, 'USD')}
              </span>
            )}
          </>
        ) : (
          <span className="quote-placeholder num">—</span>
        )}
      </div>

      <div className="quote-fx">
        <span className="num">1 USD = {usdToCny.toFixed(4)} CNY</span>
        {fxSource === 'fallback' ? (
          <span className="fx-badge is-fallback">汇率为兜底值</span>
        ) : (
          <span className="fx-badge">实时汇率</span>
        )}
      </div>
    </aside>
  )
}
