import { useEffect, useRef, useState } from 'react';
import {
  Animated,
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

  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const fadeIn = () =>
      Animated.timing(opacity, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      });

    const fadeOut = () =>
      Animated.timing(opacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      });

    fadeIn().start();

    const studioTimer = setTimeout(() => {
      fadeOut().start(() => {
        setStage('broomstick');
        fadeIn().start();
      });
    }, 1150);

    const finishTimer = setTimeout(() => {
      fadeOut().start(() => {
        onFinished();
      });
    }, 2450);

    return () => {
      clearTimeout(studioTimer);
      clearTimeout(finishTimer);
      opacity.stopAnimation();
    };
  }, [onFinished, opacity]);

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
      <Animated.View
        style={[
          styles.imageFrame,
          { opacity },
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
      </Animated.View>
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

  imageFrame: {
    width: '100%',
    height: '100%',
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
