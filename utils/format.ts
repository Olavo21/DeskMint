export const fmt = (v: number): string =>
  v.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

export const fmt2 = (v: number): string =>
  v.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 })

export const pct = (v: number): string =>
  `${(v * 100).toFixed(1)}%`
