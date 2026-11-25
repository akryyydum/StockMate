import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useAppTheme } from '../ThemeProvider';
import { fontFamilies, getThemeColors, ThemeColors } from '../theme';

type Props = {
  label?: string;
  size?: number;
  style?: ViewStyle;
};

export function LoadingAnimation({ label, size = 34, style }: Props) {
  const { mode, palette: appPalette } = useAppTheme();
  return <Spinner label={label} size={size} style={style} palette={appPalette} mode={mode} />;
}

export function StartupLoadingAnimation({ label = 'Opening StockMate' }: { label?: string }) {
  const palette = getThemeColors('light');
  return <Spinner label={label} size={38} palette={palette} mode="light" fullScreen />;
}

function Spinner({
  label,
  size,
  style,
  palette,
  mode,
  fullScreen = false,
}: Omit<Props, 'size'> & {
  size: number;
  palette: ThemeColors;
  mode: 'light' | 'dark';
  fullScreen?: boolean;
}) {
  const [rotation] = useState(() => new Animated.Value(0));
  const [pulse] = useState(() => new Animated.Value(0));
  const styles = createStyles(palette, size);

  useEffect(() => {
    const spin = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 1100,
        useNativeDriver: true,
      }),
    );
    const breathe = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 650, useNativeDriver: true }),
      ]),
    );
    spin.start();
    breathe.start();
    return () => {
      spin.stop();
      breathe.stop();
    };
  }, [pulse, rotation]);

  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const scale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1.08],
  });
  const content = (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label ?? 'Loading'}
      style={[styles.container, style]}
    >
      <View style={styles.mark}>
        <Animated.View style={[styles.orbit, { transform: [{ rotate }] }]}>
          <View style={styles.orbitDot} />
          <View style={styles.orbitDotMuted} />
        </Animated.View>
        <Animated.View style={[styles.center, { transform: [{ scale }] }]}>
          <Text style={styles.centerMark}>S</Text>
        </Animated.View>
      </View>
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
  return fullScreen ? (
    <View style={[styles.fullScreen, { backgroundColor: mode === 'dark' ? palette.background : palette.boneWhite }]}>
      {content}
    </View>
  ) : content;
}

function createStyles(palette: ThemeColors, size: number) {
  return StyleSheet.create({
    fullScreen: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    container: { alignItems: 'center', justifyContent: 'center', gap: 10 },
    mark: { width: size, height: size, alignItems: 'center', justifyContent: 'center' },
    orbit: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
    orbitDot: { position: 'absolute', top: 0, width: Math.max(5, size * 0.17), height: Math.max(5, size * 0.17), borderRadius: size, backgroundColor: palette.pumpkinOrange },
    orbitDotMuted: { position: 'absolute', bottom: 1, width: Math.max(3, size * 0.1), height: Math.max(3, size * 0.1), borderRadius: size, backgroundColor: palette.burntYellow },
    center: { width: size * 0.58, height: size * 0.58, alignItems: 'center', justifyContent: 'center', borderRadius: size * 0.22, backgroundColor: palette.accentSoft },
    centerMark: { color: palette.dirtyOrange, fontSize: size * 0.28, fontFamily: fontFamilies.bold },
    label: { color: palette.muted, fontSize: 10, textAlign: 'center', fontFamily: fontFamilies.medium },
  });
}
