import { Ionicons } from '@expo/vector-icons';
import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from 'expo-audio';
import { useEffect } from 'react';
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

type NarrationPlayerProps = {
  title: string;
  sourceUri?: string | null;
  durationHintSeconds?: number | null;
  loading?: boolean;
  offlineAvailable?: boolean;
  unavailableReason?:
    | 'not-uploaded'
    | 'not-entitled'
    | 'service-unavailable'
    | null;
};

export function NarrationPlayer({
  title,
  sourceUri = null,
  durationHintSeconds = null,
  loading = false,
  offlineAvailable = false,
  unavailableReason = null,
}: NarrationPlayerProps) {
  const player = useAudioPlayer(null, {
    updateInterval: 250,
  });
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    });
  }, []);

  useEffect(() => {
    player.pause();
    void player.seekTo(0);

    if (sourceUri) {
      player.replace(sourceUri);
      player.loop =
        __DEV__ &&
        sourceUri.includes('dev-tour-narration-test.mp3');
    } else {
      player.loop = false;
    }
  }, [player, sourceUri]);

  const hasAudio = Boolean(sourceUri);
  const positionSeconds =
    status.currentTime ?? 0;
  const durationSeconds =
    status.duration > 0
      ? status.duration
      : durationHintSeconds;
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

  const play = () => {
    if (!sourceUri) return;

    player.setActiveForLockScreen(true, {
      title,
      artist: 'BROOMSTICK Salem',
      albumTitle: 'BROOMSTICK Plus Tour',
    });

    if (status.didJustFinish) {
      void player.seekTo(0);
    }

    player.play();
  };

  const stop = () => {
    player.pause();
    void player.seekTo(0);
  };

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

        {offlineAvailable ? (
          <View style={styles.offlineBadge}>
            <Ionicons
              name="cloud-done"
              size={15}
              color={colors.success}
            />
            <Text style={styles.offlineBadgeText}>
              OFFLINE
            </Text>
          </View>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.unavailablePanel}>
          <Ionicons
            name="hourglass-outline"
            size={22}
            color={colors.gold}
          />
          <View style={styles.unavailableCopy}>
            <Text style={styles.unavailableTitle}>
              Checking narration…
            </Text>
            <Text style={styles.caption}>
              Verifying access and looking for an offline
              TourSafe copy.
            </Text>
          </View>
        </View>
      ) : !hasAudio ? (
        <View style={styles.unavailablePanel}>
          <Ionicons
            name={
              unavailableReason === 'not-entitled'
                ? 'lock-closed-outline'
                : unavailableReason === 'service-unavailable'
                  ? 'cloud-offline-outline'
                  : 'musical-notes-outline'
            }
            size={22}
            color={colors.textMuted}
          />

          <View style={styles.unavailableCopy}>
            <Text style={styles.unavailableTitle}>
              {unavailableReason === 'not-entitled'
                ? 'Narration requires BROOMSTICK Plus'
                : unavailableReason === 'service-unavailable'
                  ? 'Narration service unavailable'
                  : 'Narration not uploaded yet'}
            </Text>

            <Text style={styles.caption}>
              {unavailableReason === 'service-unavailable'
                ? 'BROOMSTICK could not verify this narration and no offline TourSafe copy is available yet.'
                : 'The player is ready. Once narrated audio is attached to this stop, playback activates here automatically.'}
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
              disabled={status.isBuffering}
              onPress={
                status.playing
                  ? () => player.pause()
                  : play
              }
              style={({ pressed }) => [
                styles.playButton,
                status.isBuffering &&
                  styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name={
                  status.isBuffering
                    ? 'hourglass-outline'
                    : status.playing
                      ? 'pause'
                      : 'play'
                }
                size={24}
                color={colors.background}
              />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={positionSeconds <= 0}
              onPress={stop}
              style={({ pressed }) => [
                styles.stopButton,
                positionSeconds <= 0 &&
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

            {status.error ? (
              <Text style={styles.errorText}>
                Playback error
              </Text>
            ) : null}
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
          {offlineAvailable
            ? 'TourSafe copy saved on this device. Manual playback remains available without cellular service.'
            : 'When narration is verified, TourSafe can keep a local copy so manual playback survives weak cellular service.'}
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

  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },

  offlineBadgeText: {
    ...typography.caption,
    color: colors.success,
    fontSize: 9,
    fontWeight: '900',
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
    height: 7,
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
    width: 58,
    height: 58,
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

  errorText: {
    ...typography.caption,
    color: '#FF7D89',
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
