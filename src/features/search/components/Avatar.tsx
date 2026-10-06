import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';

type Props = {
  /** Local image from require(), or a web URL. Missing = initials only. */
  source?: string | number;
  name: string;
  size?: number;
  radius?: number;
};

const initials = (name: string) =>
  name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

/** Photo with an initials fallback when missing, loading, or failed. */
export function Avatar({ source, name, size = 56, radius }: Props) {
  const [failed, setFailed] = useState(false);
  const borderRadius = radius ?? size / 2;

  return (
    <View style={[styles.base, { width: size, height: size, borderRadius }]}>
      <Text style={[styles.initials, { fontSize: size * 0.34 }]}>{initials(name)}</Text>
      {source !== undefined && !failed && (
        <Image
          source={typeof source === 'string' ? { uri: source } : source}
          resizeMode="cover"
          // Explicit size: on web, local images otherwise render at their intrinsic 400×400.
          style={[styles.image, { width: size, height: size, borderRadius }]}
          onError={() => setFailed(true)}
          accessibilityLabel={`Photo of ${name}`}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initials: { color: colors.primary, fontWeight: '700' },
  image: { position: 'absolute', top: 0, left: 0 },
});
