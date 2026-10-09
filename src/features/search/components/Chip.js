import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../../../constants/colors';
export function Chip({ label, selected, onPress, icon }) {
    return (<Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected }} style={({ pressed }) => [styles.chip, selected && styles.selected, pressed && styles.pressed]}>
      {icon && <Ionicons name={icon} size={14} color={selected ? '#fff' : colors.primary}/>}
      <Text style={[styles.text, selected && styles.selectedText]}>{label}</Text>
    </Pressable>);
}
const styles = StyleSheet.create({
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.primaryBorder,
        backgroundColor: colors.card,
    },
    selected: { backgroundColor: colors.primary, borderColor: colors.primary },
    pressed: { opacity: 0.75 },
    text: { fontSize: 13, fontWeight: '600', color: colors.primary },
    selectedText: { color: '#fff' },
});
