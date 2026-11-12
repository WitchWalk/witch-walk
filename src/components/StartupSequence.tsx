import { useEffect, useState } from 'react';
import {
  Image,
  StyleSheet,
  View,
} from 'react-native';

const fiveFootFourSplash =
  require('../../assets/startup/five-foot-four-splash.jpg');

const broomstickSplash =
  require('../../assets/startup/broomstick-splash.jpg');

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
      2500,
    );

    return () => {
      clearTimeout(studioTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinished]);

  const isStudio = stage === 'studio';

  return (
    <View
      pointerEvents="auto"
      style={[
        styles.overlay,
        isStudio
          ? styles.studioBackground
          : styles.broomstickBackground,
      ]}
    >
      <Image
        resizeMode="contain"
        source={
          isStudio
            ? fiveFootFourSplash
            : broomstickSplash
        }
        style={styles.image}
      />
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

  image: {
    width: '100%',
    height: '100%',
  },

  studioBackground: {
    backgroundColor: '#F5F1E8',
  },

  broomstickBackground: {
    backgroundColor: '#09040E',
  },
});
