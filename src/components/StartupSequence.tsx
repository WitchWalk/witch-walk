import { useEffect, useRef } from 'react';
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
  const studioOpacity = useRef(
    new Animated.Value(0),
  ).current;

  const broomstickOpacity = useRef(
    new Animated.Value(0),
  ).current;

  const wholeSequenceOpacity = useRef(
    new Animated.Value(1),
  ).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(studioOpacity, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),

      Animated.delay(850),

      Animated.parallel([
        Animated.timing(studioOpacity, {
          toValue: 0,
          duration: 360,
          useNativeDriver: true,
        }),
        Animated.timing(broomstickOpacity, {
          toValue: 1,
          duration: 360,
          useNativeDriver: true,
        }),
      ]),

      Animated.delay(850),

      Animated.timing(wholeSequenceOpacity, {
        toValue: 0,
        duration: 320,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        onFinished();
      }
    });

    return () => {
      studioOpacity.stopAnimation();
      broomstickOpacity.stopAnimation();
      wholeSequenceOpacity.stopAnimation();
    };
  }, [
    broomstickOpacity,
    onFinished,
    studioOpacity,
    wholeSequenceOpacity,
  ]);

  return (
    <Animated.View
      pointerEvents="auto"
      style={[
        styles.overlay,
        { opacity: wholeSequenceOpacity },
      ]}
    >
      <View style={styles.studioLayer}>
        <Animated.View
          style={[
            styles.fullScreenLayer,
            { opacity: studioOpacity },
          ]}
        >
          <Image
            resizeMode="contain"
            source={fiveFootFourSplash}
            style={styles.image}
          />
        </View>
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.broomstickLayer,
          { opacity: broomstickOpacity },
        ]}
      >
        <View style={styles.fullScreenLayer}>
          <Image
            resizeMode="contain"
            source={broomstickSplash}
            style={styles.image}
          />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 9999,
    backgroundColor: '#09040E',
  },

  fullScreenLayer: {
    ...StyleSheet.absoluteFill,
  },

  studioLayer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#F5F1E8',
  },

  broomstickLayer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#09040E',
  },

  image: {
    width: '100%',
    height: '100%',
  },
});
