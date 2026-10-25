// Entrada de valores em euros escrita à mão: só algarismos e um separador decimal
// (vírgula ou ponto, mostrado como vírgula), no máximo 2 casas decimais e, se for
// dado, um valor máximo. Não é uma máscara de moeda: só impede sequências sem
// sentido, como os 20 algarismos que partiam o simulador de amortização.

export function sanitizeMoneyInput(text: string, max?: number): string {
  let s = text.replace(/\./g, ',').replace(/[^0-9,]/g, '')
  const comma = s.indexOf(',')
  if (comma !== -1) {
    // Um só separador, e no máximo 2 casas depois dele.
    s = s.slice(0, comma + 1) + s.slice(comma + 1).replace(/,/g, '').slice(0, 2)
  }
  s = s.replace(/^0+(?=\d)/, '')
  if (max !== undefined && parseMoneyInput(s) > max) {
    s = max.toFixed(2).replace('.', ',')
  }
  return s
}

export function parseMoneyInput(text: string): number {
  const n = Number(text.replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

/** Algarismos que um valor até `max` pode ter, com vírgula e 2 casas. */
export function moneyMaxLength(max: number): number {
  return String(Math.floor(Math.max(max, 0))).length + 3
}
