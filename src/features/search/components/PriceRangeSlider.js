import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../../../constants/colors';
const THUMB = 28;
/** Dual-handle range slider using the responder system (works on iOS, Android, and web). */
export function PriceRangeSlider({ min, max, step, low, high, onChange }) {
    const [width, setWidth] = useState(0);
    const [drag, setDrag] = useState(null);
    const toPx = (value) => ((value - min) / (max - min)) * width;
    const onMove = (e) => {
        if (!drag || width === 0)
            return;
        const delta = ((e.nativeEvent.pageX - drag.startX) / width) * (max - min);
        const value = Math.round(Math.min(Math.max(drag.startValue + delta, min), max) / step) * step;
        if (drag.thumb === 'low')
            onChange(Math.min(value, high - step), high);
        else
            onChange(low, Math.max(value, low + step));
    };
    const thumbProps = (thumb) => ({
        onStartShouldSetResponder: () => true,
        onMoveShouldSetResponder: () => true,
        onResponderTerminationRequest: () => false,
        onResponderGrant: (e) => setDrag({ thumb, startX: e.nativeEvent.pageX, startValue: thumb === 'low' ? low : high }),
        onResponderMove: onMove,
        onResponderRelease: () => setDrag(null),
        onResponderTerminate: () => setDrag(null),
        accessibilityRole: 'adjustable',
        accessibilityLabel: thumb === 'low' ? 'Minimum price' : 'Maximum price',
        accessibilityValue: { min, max, now: thumb === 'low' ? low : high },
    });
    const onLayout = (e) => setWidth(e.nativeEvent.layout.width - THUMB);
    return (<View style={styles.container} onLayout={onLayout}>
      <View style={styles.track}/>
      {width > 0 && (<>
          <View style={[styles.range, { left: THUMB / 2 + toPx(low), width: toPx(high) - toPx(low) }]}/>
          <View {...thumbProps('low')} style={[styles.thumb, { left: toPx(low) }, drag?.thumb === 'low' && styles.active]}/>
          <View {...thumbProps('high')} style={[styles.thumb, { left: toPx(high) }, drag?.thumb === 'high' && styles.active]}/>
        </>)}
    </View>);
}
const styles = StyleSheet.create({
    container: { height: THUMB + 8, justifyContent: 'center' },
    track: {
        position: 'absolute',
        left: THUMB / 2,
        right: THUMB / 2,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.border,
    },
    range: { position: 'absolute', height: 6, borderRadius: 3, backgroundColor: colors.primary },
    thumb: {
        position: 'absolute',
        width: THUMB,
        height: THUMB,
        borderRadius: THUMB / 2,
        backgroundColor: '#fff',
        borderWidth: 3,
        borderColor: colors.primary,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
        cursor: 'pointer',
    },
    active: { transform: [{ scale: 1.15 }] },
});
