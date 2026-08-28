# LLM Token Price Calculator — Design Spec

**Date:** 2026-08-28  
**Status:** Approved for implementation planning  
**Reference:** [tokencalculator.ai](https://tokencalculator.ai/)

## Goal

Build a public, browser-based token cost calculator for Chinese users. Compare mainstream LLM pricing across selected domestic and international providers, with **CNY and USD** display and live FX conversion. Inspired by tokencalculator.ai, with stronger domestic-model coverage and dual-currency UX.

## Users & Success Criteria

- **Audience:** Public product for domestic (China) users choosing or budgeting LLM APIs.
- **Success:** User can enter text, word count, or token count; pick an output scenario (or override); see a sorted cost comparison across supported models in USD, CNY, or both; optional cache / batch / thinking pricing where models support them.
- **Non-goals (v1):** Accounts, saved history, server-side logging, automated scraping of vendor price pages, full i18n (UI defaults to Chinese; model names may be bilingual).

## Approach

**Pure static SPA (Vite + React)** — all calculation client-side; deploy to Cloudflare Pages or GitHub Pages. Pricing is curated structured data shipped with the app. FX rates from a CORS-friendly public API with a hardcoded fallback.

Rejected for v1: CI price scrapers; Cloudflare Worker backend (may revisit later for FX reliability or price hosting without full redeploy).

## Architecture

```
┌─────────────────────────────────────────┐
│  UI (React)                             │
│  Input modes · scenarios · currency ·   │
│  filters · results table                │
└───────────────┬─────────────────────────┘
                │
┌───────────────▼─────────────────────────┐
│  Calculation engine (pure functions)    │
│  text/words → estimate tokens → cost    │
└───────────────┬─────────────────────────┘
                │
     ┌──────────┴──────────┐
     ▼                     ▼
 Pricing data (TS/JSON)   FX service
 Bundled with site        Browser → public API
 Manual update + deploy   Fallback rate on failure
```

**Boundaries:**

- No persistence of user input; no auth; no backend.
- Pricing catalog is the source of truth; vendor price changes require data edit + redeploy.
- Each model keeps its **official list currency** (`USD` or `CNY`). The other currency is derived via FX for display only.

## Providers & Models (v1)

| Region | Providers |
|--------|-----------|
| Domestic | DeepSeek, 智谱 GLM, MiniMax |
| International | OpenAI, Anthropic, Google |

Ship **2–4 current flagship / commonly used models per provider** (not the full catalog). Catalog is extensible; UI groups and filters by provider.

Exact model IDs and list prices are filled from official docs at implementation time and recorded with `updatedAt`.

## Data Model

```ts
type MoneyCurrency = 'USD' | 'CNY'

type Provider = {
  id: string
  name: string
  nameZh: string
  website: string
}

type ModelPricing = {
  currency: MoneyCurrency   // official list currency
  unit: 1_000_000           // price per 1M tokens
  input: number
  output: number
  cachedInput?: number
  longContext?: {
    thresholdTokens: number
    input: number
    output: number
  }
  batch?: { input: number; output: number }
  thinking?: { output: number }  // when billed separately from normal output
}

type Model = {
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
  }
  notes?: string
  updatedAt: string  // ISO date; shown in UI
}
```

**Pricing rule application (in order):**

1. Start from standard `input` / `output`.
2. If user enabled cache **and** `cachedInput` exists → use `cachedInput` for input.
3. If user enabled batch **and** `batch` exists → use batch input/output (batch takes precedence over standard for those fields; interaction with cache follows vendor docs where known, otherwise document a single explicit rule in code comments: batch rates replace standard input/output; cache toggle ignored when batch is on unless a model defines both clearly).
4. If `inputTokens > longContext.thresholdTokens` → use long-context input/output (and still apply cache/batch only if those fields exist on the long-context tier; v1 long-context object only carries input/output — cache/batch on long tier is out of scope unless added later).
5. If user enabled thinking **and** provides thinking token count (or a portion of output marked as thinking) **and** `thinking.output` exists → bill that portion at thinking rate; remainder at normal output.

**Clarified v1 thinking UX:** When thinking is enabled for a supporting model, show an optional “thinking tokens” field (default 0 or a fraction of estimated output). Total output cost = `thinkingTokens * thinking.output + (outputTokens - thinkingTokens) * output`, clamped so thinking tokens ≤ output tokens.

## UI & Interaction

Single-page, top-to-bottom:

1. **Input** — tabs: `文本` | `词数` | `Token 数`
   - **文本:** paste/type → show chars, words, estimated input tokens.
   - **词数:** enter word/character count → estimate input tokens.
   - **Token 数:** enter input tokens directly (most accurate path).

2. **Output** — scenario dropdown maps to fixed output:input ratios; adjacent numeric field for manual override (marks “自定义” when edited away from preset).

   | Scenario (UI) | Ratio (output ÷ input) |
   |---------------|------------------------|
   | 分类 | 0.05 |
   | RAG | 0.25 |
   | 短对话 | 0.5 |
   | 完整回复 | 1.0 |
   | 长生成 | 2.0 |

   When input tokens change and the user has not customized output, recompute `outputTokens = round(inputTokens * ratio)`. Minimum output tokens when input > 0: `1`.

3. **Options** — currency display `USD | CNY | 双显`; toggles for cache / batch / thinking (only affect models that support them); multi-select provider filter.

4. **Results** — rows sorted by total cost ascending; columns: model, provider, input cost, output cost (incl. thinking if on), total; currency per display mode. Expand row for notes + `updatedAt`. Badge “长上下文价” when long-context tier applied. In **双显** mode, sort by USD total (stable primary key); show both currency columns.

**Token estimation disclaimer (always visible near estimates):** estimates are approximate, not each model’s official tokenizer. Heuristic for mixed CN/EN: Chinese ≈ 1–1.5 tokens per character; English ≈ 1.3 tokens per word (tunable constants in one module).

**Language:** UI Chinese by default.

## Data Flow

```
User input
  → normalize to inputTokens + outputTokens (+ optional thinkingTokens)
  → for each visible model: apply pricing rules
  → convert to display currencies via FX rate
  → sort by total in primary display currency
  → render table
```

**FX:**

- Fetch on load from a CORS-friendly public API (e.g. Frankfurter: USD↔CNY).
- Cache in `localStorage` (TTL ~6 hours).
- On failure/timeout: use bundled fallback rate + visible “汇率为兜底值” indicator.
- Recalculation is synchronous once rate is known; no blocking spinner on every keystroke beyond lightweight debounce for text mode if needed.

## Error Handling

| Case | Behavior |
|------|----------|
| Empty / non-numeric / negative input | No cost rows; inline hint |
| Very large text (>100k chars) | Still compute; warn “估算可能较慢” |
| FX API failure | Fallback rate + badge; comparison still works |
| Model missing optional pricing fields | Ignore related toggles for that row |
| Long context exceeded | Auto switch tier + row badge |

## Testing

- **Unit tests** on pure functions: text/word → token heuristics; pricing rules (standard, cache, batch, thinking, long context); FX conversion; sort order.
- **No required E2E** in v1.
- **Manual checklist:** three input modes, scenario + override, currency modes, provider filter, FX failure fallback, long-context badge, thinking field.

## Project Layout (suggested)

```
src/
  data/providers.ts      # provider + model catalog
  lib/estimateTokens.ts
  lib/pricing.ts
  lib/fx.ts
  components/...         # InputTabs, OutputControls, OptionsBar, ResultsTable
  App.tsx
```

Stack: Vite, React, TypeScript. Minimal CSS (no heavy UI kit required); keep layout scannable and comparison-first.

## Out of Scope (v1)

- User accounts, cloud sync, analytics of pasted content
- Server or Worker
- Auto-updating prices from vendor sites
- Exhaustive model catalog
- Per-model official tokenizer accuracy
- Multi-language UI packs

## Open Decisions Resolved

| Topic | Decision |
|-------|----------|
| Product type | Public, China-oriented |
| Providers | DeepSeek, GLM, MiniMax + OpenAI, Anthropic, Google |
| Input modes | Text, word count, token count |
| Output | Scenario presets + manual override |
| Currency | Live FX + USD/CNY/dual display |
| Pricing depth | Align with official: cache, long context, batch, thinking |
| Delivery | Pure static Vite + React SPA |
