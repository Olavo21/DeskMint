// Fallback para Web: @react-native-community/datetimepicker não tem implementação
// para esta plataforma (devolve null + warning). Usa o <input type="date"> nativo
// do browser, mantendo a mesma assinatura de props/onChange do componente real.
type Props = {
  value: Date
  mode?: 'date' | 'time'
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

function toHHmm(d: Date) {
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

const inputStyle = {
  fontSize: 16,
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid #c9d4cf',
  color: '#0f172a',
  background: '#f8faf9',
  marginTop: 4,
  width: '100%',
  boxSizing: 'border-box' as const,
}

export default function CrossDateTimePicker({ value, mode = 'date', onChange, minimumDate, maximumDate }: Props) {
  if (mode === 'time') {
    return (
      <input
        type="time"
        autoFocus
        value={toHHmm(value)}
        onChange={(e) => {
          const v = e.target.value
          if (!v) return
          const [h, m] = v.split(':').map(Number)
          const next = new Date(value)
          next.setHours(h, m, 0, 0)
          onChange({ type: 'set' }, next)
        }}
        style={inputStyle}
      />
    )
  }

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
      style={inputStyle}
    />
  )
}
