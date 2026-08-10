# Changelog — DeskMint

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.4.2] — 2026-08-10 · versionCode 9 · Internal Testing ✅

### Fixed
- Restored missing source assets (`logo-icon.png`, `icon.png`, `splash-icon.png`) that had been deleted from the working directory, causing a Metro `UnableToResolveError` on mobile dev client

### Changed
- Tab bar redesigned: all 9 module tabs now visible directly (icon size 20 px, label 9 pt), eliminating the "Mais" intermediate screen that left half the page empty
- "Mais" route kept in the router with `href: null` (hidden from tab bar)
- Tab labels shortened for density: Invest., Assist., Relat., Ferrament.

---

## [1.4.1] — 2026-08-06 · versionCode 8

### Added
- **XTB XLSX Import** — full end-to-end import flow for XTB brokerage portfolios
  - `lib/xtbParser.ts`: content-signature scanning (col[3]=STOCK|ETF, col[4]=empty) — language-agnostic, works with PT and EN XTB exports regardless of sheet name or order
  - `components/investments/XtbImportModal.tsx`: dedicated import modal with preview step before writing to DB
  - `components/investments/BrokerModal.tsx`: XTB intercept path using `parseXtbArrayBuffer`, preventing fallthrough to generic parser

### Fixed
- XTB parser was reading Closed Positions sheet (first sheet) instead of Open Positions
- `readAsStringAsync` (deprecated in Expo SDK 56) replaced with `new ExpoFile(uri).arrayBuffer()` on native and `asset.file.arrayBuffer()` on web
- `import XLSX from 'xlsx'` (default import = undefined in Expo web bundle) corrected to `import * as XLSX from 'xlsx'`
- XTB exports in Portuguese language (sheet name "Posições Abertas") now parsed correctly

### Removed
- `usePlan` plan-gating conditions removed from tab bar — `canAccessInvestimentos`, `canAccessComissoes`, `canAccessRelatorios` no longer applied as tab tint colors
- `TAB_COLOR_LOCKED` constant removed from `app/(tabs)/_layout.tsx`
- Tab bar consolidated from 9 visible tabs to 5 visible + 5 hidden behind "Mais" screen (later reversed in v1.4.2)

---

## [1.4.0] — 2026-08-04 · versionCode 7 · Internal Testing ✅

### Changed
- **Dashboard simplification**: "Mês" card promoted to top with Income / Expenses / Disponível summary; tap navigates to Orçamento tab
- "Conta à Ordem" renamed to "Disponível Este Mês" (subtitle: "Saldo após despesas")
- `ProjectionCard` moved to bottom of Dashboard scroll
- `KpiCard` detail rows removed from expanded block

### Fixed
- `NetWorthChart`: flat-line guard — when `range === 0`, shows "Estável — sem variação registada" instead of a straight line
- `NetWorthChart`: delta badge above SVG (+/- € in teal/red)

---

## [1.3.1] — 2026-08-03 · commit 19b6ccc

### Added
- `dia_vencimento` column (`SMALLINT DEFAULT 1 CHECK 1..31`) in `dm_recurring_expenses` — day-of-month picker for recurring expenses
- `NovaDespesaModal`: horizontal day picker (1–31) appears when "Repetir todos os meses" is active
- `NovaDespesaModal`: "Importar de Crédito" button — lists `dm_credits` and pre-fills description + amount
- `NovaDespesaModal`: fixed `getToday()` — was using a module-level stale `TODAY` constant

---

## [1.3.0] — 2026-08-03 · versionCode 6 · Internal Testing ✅

### Added
- **Saving Buckets (Objetivos)** — full CRUD: `NovoBucketModal` with edit mode, `BucketCard` with edit button, `AddAmountModal`
- `NovoBucketModal`: native `DateTimePicker`, `behavior=height` on Android, `initialBucket`/`onUpdate` props for edit mode
- **Dashboard Net Worth** — 5-category interactive card replacing the 2×2 grid: Conta à Ordem, Fundo Emergência (inline edit), Portfólio, Bens Ativos, Passivos (red)
- `grossAssetsValue` calculation: `data.assets.reduce((s,a) => s + a.value, 0)`

### Fixed
- Assistente `InsightBox`: solid background `#0f2a26` + text `#e2e8f0` (WCAG AA contrast)
- Assistente pills `ScrollView`: `flexGrow:0` + `alignItems:center` prevents vertical expansion; `paddingRight:24` for lateral peek

---

## [1.2.0] — 2026-08-02 · versionCodes 4 & 5 · Internal Testing ✅

### Added
- Investments tab: broker connections (Trading212 API key encrypted via AES-256-GCM Edge Function)
- Calculadoras (Ferramentas tab): Triângulo Financeiro, Motor FIRE, Simulador FIRE, Otimizador de Débito, Simulador Mais-Valias PT 28%
- Multi-currency support via `fmt()` / `useFmt()` reading currency from `preferencesStore`
- i18n: nested key system (`t('investments.title')`, `t('common.save')`)
- Tab Assistente redesigned: 6 analytical cards
- Hermes JS engine explicitly enabled in `app.json`
- Zustand atomic selectors to prevent unnecessary re-renders

### Fixed
- `AsyncStorage` lazy-loaded via `require()` in try/catch in `i18n.ts`, `currencies.ts`, `definicoes.tsx`

---

## [1.1.0] — 2026-07-22 · versionCode 2

### Added
- **Savings Buckets**: `dm_saving_buckets` table, `BucketCard`, `NovoBucketModal`, `AddAmountModal`
- **Quickstart Checklist**: `dm_profiles.quickstart_completed` flag + `QuickstartChecklist` component in Dashboard
- Notification engine: `dm_notifications` table with RLS, `useNotificationEngine` (3 rules with deduplication by title + time window), unread badge in `Header`
- Notification screen `app/notificacoes.tsx` with TYPE_COLOR / TYPE_BG / TYPE_ICON maps

### Fixed
- Onboarding race condition in `_layout.tsx` — `fetchProfile` is the sole routing authority
- `handleFinish` seeds `dm_profiles`, `dm_budget_rules`, `dm_net_worth_snapshots`

---

## [1.0.0] — 2026-07-15 · versionCode 1 · Founders Preview

### Added
- Project bootstrap: Expo SDK 56, React Native 0.85.3, Expo Router, NativeWind v4, Supabase
- Authentication flow: login with Supabase Auth, onboarding (4-step, progress bar, investor profile)
- Budget coortes: CONSERVATIVE 60/20/20, MODERATE 50/30/20, AGGRESSIVE 45/25/30, SPECULATIVE 40/20/40
- Core tabs: Dashboard, Orçamento, Investimentos, Assistente, Créditos, Comissões, Relatórios, Fisco, Ferramentas
- `dm_profiles`, `dm_budget_rules`, `dm_recurring_expenses`, `dm_expense_categories`, `dm_transactions` tables with RLS
- Long-term projection engine: `lib/projection.ts` — `computeProjection` (annuity formula), RATE_BY_INVESTOR_TYPE, YEARS_BY_HORIZON
- Settings screen: investor profile chips, monthly investment input, persists to Supabase
- Legal pages on GitHub Pages: `docs/terms.html`, `docs/privacy.html`, `docs/delete-account.html`
- EAS Build configuration: project ID `727241b8-4cd7-4649-bf85-112899526204`, channel `production`
