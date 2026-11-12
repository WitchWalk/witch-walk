import { Ionicons } from '@expo/vector-icons';
import {
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { AppText as Text } from '@/components/AppText';
import {
  colors,
  radius,
  spacing,
  typography,
} from '@/theme/tokens';

export type NarrationPlaybackState =
  | 'unavailable'
  | 'loading'
  | 'ready'
  | 'playing'
  | 'paused'
  | 'finished'
  | 'error';

type NarrationPlayerProps = {
  title: string;
  state: NarrationPlaybackState;
  durationSeconds?: number | null;
  positionSeconds?: number;
  onPlay?: () => void;
  onPause?: () => void;
  onStop?: () => void;
};

export function NarrationPlayer({
  title,
  state,
  durationSeconds = null,
  positionSeconds = 0,
  onPlay,
  onPause,
  onStop,
}: NarrationPlayerProps) {
  const hasAudio =
    state !== 'unavailable' &&
    state !== 'error';

  const isPlaying = state === 'playing';

  const progress =
    durationSeconds && durationSeconds > 0
      ? Math.min(
          1,
          Math.max(
            0,
            positionSeconds / durationSeconds,
          ),
        )
      : 0;

  return (
    <View style={styles.card}>
      <View style={styles.headingRow}>
        <View style={styles.iconShell}>
          <Ionicons
            name="headset"
            size={20}
            color={colors.gold}
          />
        </View>

        <View style={styles.headingCopy}>
          <Text style={styles.eyebrow}>
            BROOMSTICK PLUS NARRATION
          </Text>

          <Text
            numberOfLines={2}
            style={styles.title}
          >
            {title}
          </Text>
        </View>
      </View>

      {!hasAudio ? (
        <View style={styles.unavailablePanel}>
          <Ionicons
            name={
              state === 'error'
                ? 'warning-outline'
                : 'cloud-offline-outline'
            }
            size={22}
            color={colors.textMuted}
          />

          <View style={styles.unavailableCopy}>
            <Text style={styles.unavailableTitle}>
              {state === 'error'
                ? 'Narration unavailable'
                : 'Narration not uploaded yet'}
            </Text>

            <Text style={styles.caption}>
              The player is ready. Once audio is attached
              to this stop, playback controls will activate
              here automatically.
            </Text>
          </View>
        </View>
      ) : (
        <>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${progress * 100}%` },
              ]}
            />
          </View>

          <View style={styles.timeRow}>
            <Text style={styles.timeText}>
              {formatAudioTime(positionSeconds)}
            </Text>

            <Text style={styles.timeText}>
              {durationSeconds !== null
                ? formatAudioTime(durationSeconds)
                : '--:--'}
            </Text>
          </View>

          <View style={styles.controls}>
            <Pressable
              accessibilityRole="button"
              disabled={state === 'loading'}
              onPress={
                isPlaying
                  ? onPause
                  : onPlay
              }
              style={({ pressed }) => [
                styles.playButton,
                state === 'loading' &&
                  styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name={
                  state === 'loading'
                    ? 'hourglass-outline'
                    : isPlaying
                      ? 'pause'
                      : 'play'
                }
                size={24}
                color={colors.background}
              />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={
                state === 'loading' ||
                positionSeconds <= 0
              }
              onPress={onStop}
              style={({ pressed }) => [
                styles.stopButton,
                (state === 'loading' ||
                  positionSeconds <= 0) &&
                  styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name="stop"
                size={20}
                color={colors.text}
              />

              <Text style={styles.stopText}>
                Stop
              </Text>
            </Pressable>
          </View>
        </>
      )}

      <View style={styles.offlineRow}>
        <Ionicons
          name="shield-checkmark-outline"
          size={16}
          color={colors.gold}
        />

        <Text style={styles.offlineText}>
          Manual playback remains available at every
          purchased stop. Offline TourSafe caching comes
          next.
        </Text>
      </View>
    </View>
  );
}

function formatAudioTime(seconds: number) {
  const safeSeconds = Math.max(
    0,
    Math.floor(seconds),
  );

  const minutes = Math.floor(
    safeSeconds / 60,
  );

  const remainder = safeSeconds % 60;

  return `${minutes}:${remainder
    .toString()
    .padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    borderWidth: 1,
    borderColor: '#745493',
    borderRadius: radius.lg,
    backgroundColor: '#17101F',
    padding: spacing.lg,
  },

  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },

  iconShell: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: '#2A1C38',
  },

  headingCopy: {
    flex: 1,
    gap: 2,
  },

  eyebrow: {
    ...typography.eyebrow,
    color: colors.gold,
  },

  title: {
    ...typography.heading,
    fontSize: 17,
    lineHeight: 22,
  },

  unavailablePanel: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },

  unavailableCopy: {
    flex: 1,
    gap: 3,
  },

  unavailableTitle: {
    ...typography.body,
    fontWeight: '900',
  },

  caption: {
    ...typography.caption,
  },

  progressTrack: {
    height: 6,
    overflow: 'hidden',
    borderRadius: radius.pill,
    backgroundColor: '#3A3044',
  },

  progressFill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.gold,
  },

  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  timeText: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '800',
  },

  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },

  playButton: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.gold,
  },

  stopButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
  },

  stopText: {
    ...typography.body,
    fontWeight: '800',
  },

  disabled: {
    opacity: 0.4,
  },

  pressed: {
    opacity: 0.8,
  },

  offlineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },

  offlineText: {
    ...typography.caption,
    flex: 1,
    color: colors.textMuted,
  },
});
