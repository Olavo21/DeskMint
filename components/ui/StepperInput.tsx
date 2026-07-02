import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'

export interface StepperInputProps {
  label:    string
  value:    number
  step:     number
  min:      number
  max:      number
  suffix:   string
  decimals?:      number   // decimal places shown and used in rounding (default 0)
  onChange:       (v: number) => void
  // Visual
  labelUppercase?: boolean  // UPPERCASE label (default false)
  valueColor?:     string   // value text color (default '#2dd4bf')
  buttonWidth?:    number   // −/+ button width px (default 38)
  controlHeight?:  number   // control row height px (default 44)
  valueFontSize?:  number   // value text fontSize (default 13)
  // Layout
  layout?:   'vertical' | 'horizontal'  // vertical = label above (default), horizontal = label left + stepper right
  dotColor?: string  // colored dot indicator shown before label in horizontal layout
}

function StepperInputComponent({
  label, value, step, min, max, suffix,
  decimals      = 0,
  onChange,
  labelUppercase = false,
  valueColor     = '#2dd4bf',
  buttonWidth    = 38,
  controlHeight  = 44,
  valueFontSize  = 13,
  layout         = 'vertical',
  dotColor,
}: StepperInputProps) {
  const dec = () => onChange(parseFloat(Math.max(min, value - step).toFixed(decimals)))
  const inc = () => onChange(parseFloat(Math.min(max, value + step).toFixed(decimals)))

  const stepper = (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: '#0f172a', borderRadius: 12,
      borderWidth: 1, borderColor: '#334155', overflow: 'hidden',
    }}>
      <TouchableOpacity
        onPress={dec}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 0 }}
        style={{ width: buttonWidth, height: controlHeight, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: '#1e293b' }}
      >
        <Text style={{ color: value > min ? '#94a3b8' : '#334155', fontSize: 20, lineHeight: 22 }}>−</Text>
      </TouchableOpacity>

      <View style={layout === 'vertical'
        ? { flex: 1, alignItems: 'center', justifyContent: 'center' }
        : { minWidth: 60, alignItems: 'center', justifyContent: 'center' }
      }>
        <Text style={{ color: valueColor, fontSize: valueFontSize, fontWeight: '700' }}>
          {value.toFixed(decimals)}{suffix}
        </Text>
      </View>

      <TouchableOpacity
        onPress={inc}
        hitSlop={{ top: 8, bottom: 8, left: 0, right: 8 }}
        style={{ width: buttonWidth, height: controlHeight, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: '#1e293b' }}
      >
        <Text style={{ color: value < max ? '#2dd4bf' : '#334155', fontSize: 20, lineHeight: 22 }}>+</Text>
      </TouchableOpacity>
    </View>
  )

  if (layout === 'horizontal') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
          {dotColor && (
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: dotColor }} />
          )}
          <Text style={{ color: '#94a3b8', fontSize: 14 }}>{label}</Text>
        </View>
        {stepper}
      </View>
    )
  }

  return (
    <View style={{ flex: 1 }}>
      <Text style={{
        color: '#64748b', fontSize: 10, fontWeight: '600',
        letterSpacing: 0.5, marginBottom: 6,
        textTransform: labelUppercase ? 'uppercase' : 'none',
      }}>
        {label}
      </Text>
      {stepper}
    </View>
  )
}

export default React.memo(StepperInputComponent)
