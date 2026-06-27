// No iOS/Android usa a implementação nativa real da biblioteca.
// O contraponto components/ui/CrossDateTimePicker.web.tsx resolve a falta
// de suporte Web desta biblioteca (Metro escolhe o ficheiro certo por plataforma).
import DateTimePicker from '@react-native-community/datetimepicker'

export default DateTimePicker
