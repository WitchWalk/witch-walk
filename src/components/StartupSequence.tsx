import { useEffect, useState } from 'react';
import {
  Image,
  StyleSheet,
  View,
} from 'react-native';

import { AppText as Text } from '@/components/AppText';
import { colors } from '@/theme/tokens';

const broomstickLogo =
  require('../../assets/broomstick-app-logo.png');

type StartupSequenceProps = {
  onFinished: () => void;
};

export function StartupSequence({
  onFinished,
}: StartupSequenceProps) {
  const [stage, setStage] =
    useState<'studio' | 'broomstick'>('studio');

  useEffect(() => {
    const studioTimer = setTimeout(
      () => setStage('broomstick'),
      1400,
    );

    const finishTimer = setTimeout(
      onFinished,
      2400,
    );

    return () => {
      clearTimeout(studioTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinished]);

  return (
    <View
      pointerEvents="auto"
      style={[
        styles.overlay,
        stage === 'studio'
          ? styles.studioBackground
          : styles.broomstickBackground,
      ]}
    >
      {stage === 'studio' ? (
        <FiveFootFourLogo />
      ) : (
        <View style={styles.broomstickStage}>
          <Image
            resizeMode="contain"
            source={broomstickLogo}
            style={styles.broomstickLogo}
          />
          <Text style={styles.broomstickTitle}>
            BROOMSTICK
          </Text>
          <Text style={styles.broomstickSubtitle}>
            THE SALEM GUIDEBOOK
          </Text>
        </View>
      )}
    </View>
  );
}

function FiveFootFourLogo() {
  return (
    <View style={styles.studioLogo}>
      <View style={styles.ruler}>
        {Array.from({ length: 12 }, (_, index) => (
          <View
            key={index}
            style={[
              styles.rulerTick,
              index % 3 === 0 &&
                styles.rulerTickLong,
            ]}
          />
        ))}
        <Text style={styles.rulerFive}>5</Text>
      </View>

      <View style={styles.studioWords}>
        <Text style={styles.studioWord}>FIVE</Text>
        <Text style={styles.studioWord}>FOOT</Text>
        <Text style={styles.studioWord}>FOUR</Text>
        <Text style={styles.creations}>
          CREATIONS
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },

  studioBackground: {
    backgroundColor: '#F4F0E8',
  },

  broomstickBackground: {
    backgroundColor: colors.background,
  },

  studioLogo: {
    width: '82%',
    maxWidth: 390,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },

  ruler: {
    width: 60,
    height: 270,
    justifyContent: 'flex-start',
    borderWidth: 5,
    borderColor: '#172026',
    paddingTop: 15,
    paddingLeft: 7,
  },

  rulerTick: {
    width: 20,
    height: 5,
    marginBottom: 13,
    borderRadius: 3,
    backgroundColor: '#172026',
  },

  rulerTickLong: {
    width: 32,
  },

  rulerFive: {
    position: 'absolute',
    bottom: 12,
    left: 14,
    color: '#172026',
    fontSize: 54,
    lineHeight: 58,
    fontWeight: '500',
  },

  studioWords: {
    flex: 1,
    justifyContent: 'center',
  },

  studioWord: {
    color: '#172026',
    fontSize: 52,
    lineHeight: 58,
    fontWeight: '800',
    letterSpacing: -1,
  },

  creations: {
    marginTop: 10,
    color: '#172026',
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '800',
    letterSpacing: 4.4,
  },

  broomstickStage: {
    width: '82%',
    maxWidth: 420,
    alignItems: 'center',
    gap: 10,
  },

  broomstickLogo: {
    width: 180,
    height: 180,
  },

  broomstickTitle: {
    color: colors.text,
    fontFamily: 'Georgia',
    fontSize: 38,
    lineHeight: 44,
    fontWeight: '800',
    letterSpacing: 1.5,
  },

  broomstickSubtitle: {
    color: colors.gold,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '900',
    letterSpacing: 3,
  },
});
