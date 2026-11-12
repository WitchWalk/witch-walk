import { useEffect, useState } from 'react';
import {
  Image,
  StyleSheet,
  View,
} from 'react-native';

import { AppText as Text } from '@/components/AppText';

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
      1250,
    );

    const finishTimer = setTimeout(
      onFinished,
      2350,
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
        <BroomstickSplash />
      )}
    </View>
  );
}

function FiveFootFourLogo() {
  return (
    <View style={styles.studioMark}>
      <View style={styles.ruler}>
        <View style={[styles.tick, styles.tickLong]} />
        <View style={styles.tick} />
        <View style={styles.tick} />
        <View style={[styles.tick, styles.tickMedium]} />
        <View style={styles.tick} />
        <View style={styles.tick} />
        <View style={[styles.tick, styles.tickMedium]} />
        <View style={styles.tick} />
        <View style={styles.tick} />
        <View style={[styles.tick, styles.tickLong]} />
        <Text style={styles.rulerNumber}>5</Text>
      </View>

      <View style={styles.studioCopy}>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          style={styles.studioWord}
        >
          FIVE
        </Text>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          style={styles.studioWord}
        >
          FOOT
        </Text>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          style={styles.studioWord}
        >
          FOUR
        </Text>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
          style={styles.creations}
        >
          CREATIONS
        </Text>
      </View>
    </View>
  );
}

function BroomstickSplash() {
  return (
    <View style={styles.broomstickStage}>
      <View style={styles.logoGlow}>
        <Image
          resizeMode="contain"
          source={broomstickLogo}
          style={styles.broomstickLogo}
        />
      </View>

      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        style={styles.broomstickTitle}
      >
        BROOMSTICK
      </Text>

      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        style={styles.broomstickSubtitle}
      >
        THE SALEM GUIDEBOOK
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },

  studioBackground: {
    backgroundColor: '#F5F1E8',
  },

  broomstickBackground: {
    backgroundColor: '#09040E',
  },

  studioMark: {
    width: '72%',
    maxWidth: 330,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },

  ruler: {
    width: 54,
    height: 220,
    justifyContent: 'flex-start',
    borderWidth: 4,
    borderColor: '#172026',
    paddingTop: 15,
    paddingLeft: 7,
  },

  tick: {
    width: 16,
    height: 4,
    marginBottom: 11,
    borderRadius: 2,
    backgroundColor: '#172026',
  },

  tickMedium: {
    width: 23,
  },

  tickLong: {
    width: 30,
  },

  rulerNumber: {
    position: 'absolute',
    bottom: 8,
    left: 11,
    color: '#172026',
    fontSize: 42,
    lineHeight: 46,
    fontWeight: '800',
  },

  studioCopy: {
    flex: 1,
    minWidth: 0,
  },

  studioWord: {
    color: '#172026',
    fontSize: 43,
    lineHeight: 47,
    fontWeight: '900',
    letterSpacing: -0.6,
  },

  creations: {
    marginTop: 7,
    color: '#172026',
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '900',
    letterSpacing: 3.5,
  },

  broomstickStage: {
    width: '88%',
    maxWidth: 410,
    alignItems: 'center',
  },

  logoGlow: {
    width: 230,
    height: 230,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 52,
    shadowColor: '#B22BFF',
    shadowOpacity: 0.42,
    shadowRadius: 35,
    shadowOffset: {
      width: 0,
      height: 0,
    },
  },

  broomstickLogo: {
    width: 220,
    height: 220,
  },

  broomstickTitle: {
    width: '100%',
    marginTop: 36,
    color: '#F5C95A',
    fontFamily: 'Georgia',
    fontSize: 50,
    lineHeight: 56,
    fontWeight: '700',
    letterSpacing: -0.4,
    textAlign: 'center',
  },

  broomstickSubtitle: {
    width: '100%',
    marginTop: 14,
    color: '#F5C95A',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
    letterSpacing: 3.5,
    textAlign: 'center',
  },
});
