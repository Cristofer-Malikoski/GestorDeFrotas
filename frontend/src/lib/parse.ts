/**
 * Converte números digitados no padrão brasileiro.
 * Aceita "1.234,56", "1234,56", "1234.56", "R$ 1.234,56", "312,5".
 * Retorna NaN quando não é possível interpretar.
 */
export function parseDecimalBR(raw: string | number | null | undefined): number {
  if (typeof raw === 'number') return raw
  if (raw == null) return NaN
  let s = String(raw).trim().replace(/[R$\s]/g, '').replace(/L$/i, '').replace(/km$/i, '')
  if (!s) return NaN
  const hasComma = s.includes(',')
  const dots = (s.match(/\./g) ?? []).length
  if (hasComma) {
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (dots > 1 || /^\d{1,3}\.\d{3}$/.test(s)) {
    // "1.234" ou "12.345.678" → separador de milhar
    s = s.replace(/\./g, '')
  }
  if (!/^-?\d*\.?\d+$/.test(s)) return NaN
  return Number(s)
}

export function parseIntegerBR(raw: string | number | null | undefined): number {
  const n = parseDecimalBR(typeof raw === 'string' ? raw.replace(/\./g, '') : raw)
  return Number.isFinite(n) ? Math.round(n) : NaN
}
