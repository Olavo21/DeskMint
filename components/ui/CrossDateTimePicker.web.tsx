// Fallback para Web: @react-native-community/datetimepicker não tem implementação
// para esta plataforma (devolve null + warning). Usa o <input type="date"> nativo
// do browser, mantendo a mesma assinatura de props/onChange do componente real.
type Props = {
  value: Date
  mode?: 'date'
  display?: string
  onChange: (event: { type: string }, date?: Date) => void
  minimumDate?: Date
  maximumDate?: Date
  locale?: string
}

function toISODate(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function CrossDateTimePicker({ value, onChange, minimumDate, maximumDate }: Props) {
  return (
    <input
      type="date"
      autoFocus
      value={toISODate(value)}
      min={minimumDate ? toISODate(minimumDate) : undefined}
      max={maximumDate ? toISODate(maximumDate) : undefined}
      onChange={(e) => {
        const v = e.target.value
        if (!v) return
        const [y, m, d] = v.split('-').map(Number)
        onChange({ type: 'set' }, new Date(y, m - 1, d))
      }}
      style={{
        fontSize: 16,
        padding: '10px 12px',
        borderRadius: 10,
        border: '1px solid #c9d4cf',
        color: '#0f172a',
        background: '#f8faf9',
        marginTop: 4,
        width: '100%',
        boxSizing: 'border-box',
      }}
    />
  )
}
