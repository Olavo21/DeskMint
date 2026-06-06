export const PORTFOLIO_COLORS = [
  '#14b8a6', // teal — brand
  '#6366f1', // indigo
  '#f59e0b', // amber
  '#10b981', // emerald
  '#3b82f6', // blue
  '#ec4899', // pink
  '#8b5cf6', // violet
  '#f97316', // orange
  '#06b6d4', // cyan
  '#ef4444', // red
  '#84cc16', // lime
  '#a855f7', // purple
]

export function getColor(index: number): string {
  return PORTFOLIO_COLORS[index % PORTFOLIO_COLORS.length]
}
