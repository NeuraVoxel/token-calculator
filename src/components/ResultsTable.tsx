import { Fragment, useState } from 'react'
import type { CostBreakdown, CurrencyDisplay } from '../types'
import { providerById } from '../data/providers'
import { toCny, toUsd } from '../lib/pricing'

type Row = CostBreakdown & { totalUsd: number; totalCny: number }

type Props = {
  rows: Row[]
  currencyDisplay: CurrencyDisplay
  usdToCny: number
  emptyHint?: string
}

function formatMoney(n: number, currency: 'CNY' | 'USD'): string {
  const symbol = currency === 'CNY' ? '¥' : '$'
  if (n >= 1) return `${symbol}${n.toFixed(4)}`
  if (n >= 0.01) return `${symbol}${n.toFixed(6)}`
  return `${symbol}${n.toFixed(8)}`
}

function MoneyCell({
  amount,
  nativeCurrency,
  display,
  usdToCny,
}: {
  amount: number
  nativeCurrency: 'CNY' | 'USD'
  display: CurrencyDisplay
  usdToCny: number
}) {
  const cny = toCny(amount, nativeCurrency, usdToCny)
  const usd = toUsd(amount, nativeCurrency, usdToCny)
  if (display === 'CNY') return <span className="num">{formatMoney(cny, 'CNY')}</span>
  if (display === 'USD') return <span className="num">{formatMoney(usd, 'USD')}</span>
  return (
    <span className="money-dual num">
      <span>{formatMoney(cny, 'CNY')}</span>
      <span className="muted">{formatMoney(usd, 'USD')}</span>
    </span>
  )
}

export function ResultsTable({ rows, currencyDisplay, usdToCny, emptyHint }: Props) {
  const [openId, setOpenId] = useState<string | null>(null)

  if (rows.length === 0) {
    return (
      <section className="panel results" aria-labelledby="results-heading">
        <h2 id="results-heading" className="panel-title">
          比价结果
        </h2>
        <p className="empty">{emptyHint ?? '填写有效用量后显示各模型费用。'}</p>
      </section>
    )
  }

  return (
    <section className="panel results" aria-labelledby="results-heading">
      <div className="panel-head">
        <h2 id="results-heading" className="panel-title">
          比价结果
        </h2>
        <span className="meta-row">{rows.length} 个模型 · 按总价升序</span>
      </div>

      <div className="table-wrap">
        <table className="price-table">
          <thead>
            <tr>
              <th scope="col">模型</th>
              <th scope="col">厂商</th>
              <th scope="col">Input</th>
              <th scope="col">Output</th>
              <th scope="col">合计</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const provider = providerById(row.model.providerId)
              const open = openId === row.model.id
              return (
                <Fragment key={row.model.id}>
                  <tr
                    className={i === 0 ? 'is-cheapest' : undefined}
                    onClick={() => setOpenId(open ? null : row.model.id)}
                  >
                    <td>
                      <div className="model-cell">
                        <span className="model-name">{row.model.nameZh}</span>
                        {i === 0 && <span className="rank-tag">最低</span>}
                        {row.usedLongContext && (
                          <span className="rank-tag is-long">长上下文价</span>
                        )}
                      </div>
                    </td>
                    <td>{provider?.nameZh ?? row.model.providerId}</td>
                    <td>
                      <MoneyCell
                        amount={row.inputCostNative}
                        nativeCurrency={row.currency}
                        display={currencyDisplay}
                        usdToCny={usdToCny}
                      />
                    </td>
                    <td>
                      <MoneyCell
                        amount={row.outputCostNative}
                        nativeCurrency={row.currency}
                        display={currencyDisplay}
                        usdToCny={usdToCny}
                      />
                    </td>
                    <td>
                      <strong>
                        <MoneyCell
                          amount={row.totalNative}
                          nativeCurrency={row.currency}
                          display={currencyDisplay}
                          usdToCny={usdToCny}
                        />
                      </strong>
                    </td>
                  </tr>
                  {open && (
                    <tr className="detail-row">
                      <td colSpan={5}>
                        <div className="detail">
                          <p>
                            标价币种 {row.currency} · Input {row.inputRate} / Output{' '}
                            {row.outputRate} 每 1M tokens
                          </p>
                          {row.model.notes && <p>{row.model.notes}</p>}
                          <p className="muted">价格更新于 {row.model.updatedAt}</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
