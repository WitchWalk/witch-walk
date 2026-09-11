import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  Image,
  ImageBackground,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useFavorites } from '@/components/favorites/FavoritesProvider';
import { useWitchWatch } from '@/components/WitchWatchProvider';
import type { Attraction } from '@/data/attractions';
import { crowdPresentation, getWaitTimeAttraction } from '@/data/waitTimes';
import { getWaitTimeAggregate } from '@/services/waitAggregationService';
import { subscribeWaitAggregates } from '@/services/waitAggregateEvents';
import { getQuickStatusLabel, type WaitTimeAggregate } from '@/services/waitReportCore';
import { colors, radius, shadows, spacing, typography } from '@/theme/tokens';

const videoBackground = require('../../../assets/images/home/house-arauz-videos.png');

type AttractionDetailsViewProps = {
  attraction: Attraction;
};

export function AttractionDetailsView({ attraction }: AttractionDetailsViewProps) {
  const { watches } = useWitchWatch();
  const watching = watches.some(w => w.attractionId === attraction.id && w.enabled);
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorite = isFavorite('attractions', attraction.id);
  const supportsWaitReporting = Boolean(getWaitTimeAttraction(attraction.id));
  const [waitAggregate, setWaitAggregate] = useState<WaitTimeAggregate | null>(null);

  useFocusEffect(useCallback(() => {
    if (!supportsWaitReporting) return;
    let active = true;
    const unsubscribe = subscribeWaitAggregates(values => {
      const value = values.find(item => item.attractionId === attraction.id);
      if (active && value) setWaitAggregate(value);
    });
    const refresh = () => {
      void getWaitTimeAggregate(attraction.id).then((result) => {
        if (active) setWaitAggregate(result);
      });
    };
    refresh();
    const interval = setInterval(refresh, 60_000);
    return () => {
      active = false;
      unsubscribe();
      clearInterval(interval);
    };
  }, [attraction.id, supportsWaitReporting]));

  const goBackToAttractions = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/attractions');
  };

  const openUrl = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Unable to open link', 'Please try again from your browser.');
    }
  };

  const openDirections = () => {
    const query = encodeURIComponent(attraction.address);
    void openUrl(`https://www.google.com/maps/search/?api=1&query=${query}`);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Image source={attraction.image} resizeMode="cover" style={styles.heroPhoto} />
          <View style={styles.heroShade} />
          <View style={styles.topBar}>
            <Pressable accessibilityRole="button" accessibilityLabel="Back to Attractions" hitSlop={10} onPress={goBackToAttractions} style={styles.backButton}>
              <Ionicons name="chevron-back" size={27} color={colors.text} />
              <Text style={styles.backText}>Back</Text>
            </Pressable>
            <Text style={styles.brand}>Witch <Text style={styles.brandStar}>✦</Text> Walk</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Open settings" hitSlop={10} onPress={() => router.push('/more')} style={styles.iconButton}>
              <Ionicons name="settings-outline" size={20} color={colors.text} />
            </Pressable>
          </View>
        </View>

        <View style={styles.heroCopy}>
          <Text style={styles.location}>Salem, Massachusetts</Text>
          <Text style={styles.name}>{attraction.name}</Text>
          <Text style={styles.description}>{attraction.description}</Text>
        </View>

        <View style={styles.primaryInfo}>
          <View style={styles.infoRow}>
            <Ionicons name="location" size={20} color={colors.text} />
            <Text style={styles.infoText}>{attraction.address}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={20} color={colors.text} />
            <Text style={[styles.statusText, attraction.status === 'open' && styles.openText]}>{attraction.statusLabel}</Text>
            <Text style={styles.hours}>{attraction.hours}</Text>
          </View>
          <View style={styles.tagsRow}>
            {attraction.tags.map((tag) => (
              <View key={tag} style={styles.tag}><Text style={styles.tagText}>{tag}</Text></View>
            ))}
          </View>
        </View>

        {supportsWaitReporting ? (
          <View style={styles.waitInfoCard}>
            <View style={styles.waitInfoMain}>
              <Ionicons name="people" size={25} color={waitAggregate?.crowdLevel ? crowdPresentation[waitAggregate.crowdLevel].color : colors.textMuted} />
              <View style={styles.waitInfoCopy}>
                <Text style={styles.waitInfoLabel}>Current Wait</Text>
                <Text style={styles.waitInfoValue}>{waitAggregate?.estimatedWaitLabel ?? 'No recent wait reports'}</Text>
              </View>
            </View>
            <View style={styles.waitInfoMeta}>
              <Text style={[styles.waitCrowd, { color: waitAggregate?.crowdLevel ? crowdPresentation[waitAggregate.crowdLevel].color : colors.textMuted }]}>
                {waitAggregate?.crowdLevel ? crowdPresentation[waitAggregate.crowdLevel].label : 'Neutral'}
              </Text>
              <Text style={styles.waitFreshness}>{waitAggregate?.freshnessLabel ?? 'No recent wait reports'}</Text>
              {waitAggregate?.quickStatusTag ? <Text numberOfLines={1} style={styles.waitQuickStatus}>{getQuickStatusLabel(waitAggregate.quickStatusTag)}</Text> : null}
            </View>
          </View>
        ) : null}

        <View style={styles.actionsGrid}>
          <ActionButton icon="navigate" color={colors.purple} title="Directions" subtitle="Get there" onPress={openDirections} />
          {attraction.websiteUrl ? (
            <ActionButton icon="ticket" color="#F17B67" title="Tickets / Site" subtitle="View options" onPress={() => void openUrl(attraction.websiteUrl!)} />
          ) : (
            <ActionButton icon="information-circle" color="#F17B67" title="Visitor Info" subtitle="Local details" onPress={() => Alert.alert('Visitor information', attraction.hours)} />
          )}
          <ActionButton
            icon={supportsWaitReporting ? 'create-outline' : 'notifications-outline'}
            color={colors.gold}
            title={supportsWaitReporting ? 'Report Wait' : 'Witch Watch'}
            subtitle={supportsWaitReporting ? 'Share now' : watching ? 'Watching' : 'Set an alert'}
            onPress={() => supportsWaitReporting
              ? router.push({ pathname: '/report-wait/[id]', params: { id: attraction.id } })
              : router.push({ pathname: '/witch-watch', params: { id: attraction.id } })}
          />
          <ActionButton
            icon={favorite ? 'heart' : 'heart-outline'}
            color="#F18BA3"
            title={favorite ? 'Saved' : 'Favorite'}
            subtitle={favorite ? 'Added to favorites' : 'Save this place'}
            onPress={() => toggleFavorite('attractions', attraction.id)}
          />
        </View>

        {supportsWaitReporting ? <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/witch-watch', params: { id: attraction.id } })} style={{ padding: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.gold, flexDirection: 'row', gap: 10 }}><Ionicons name="notifications-outline" size={20} color={colors.gold} /><Text style={{ color: colors.gold }}>{watching ? 'Watching' : 'Witch Watch'}</Text></Pressable> : null}
        <View style={styles.infoCards}>
          <View style={styles.contentCard}>
            <View style={styles.cardHeading}>
              <Ionicons name="document-text" size={21} color={colors.gold} />
              <Text style={styles.cardTitle}>About</Text>
            </View>
            <View style={styles.rule} />
            <Text style={styles.bodyText}>{attraction.longDescription}</Text>
          </View>

          <View style={styles.contentCard}>
            <View style={styles.cardHeading}>
              <Ionicons name="bulb" size={22} color={colors.gold} />
              <Text style={styles.cardTitle}>Visitor Tips</Text>
            </View>
            <View style={styles.rule} />
            {attraction.visitorTips.map((tip, index) => (
              <View key={tip} style={styles.tipRow}>
                <Ionicons name={index === 0 ? 'checkmark-circle' : 'sparkles'} size={17} color={index === 0 ? colors.success : colors.orange} />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        </View>

        <DynamicFeature attraction={attraction} />
      </ScrollView>
    </SafeAreaView>
  );
}

type ActionButtonProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  title: string;
  subtitle: string;
  onPress: () => void;
};

function ActionButton({ icon, color, title, subtitle, onPress }: ActionButtonProps) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${title}. ${subtitle}`} onPress={onPress} style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}>
      <Ionicons name={icon} size={30} color={color} />
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={styles.actionTitle}>{title}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={styles.actionSubtitle}>{subtitle}</Text>
    </Pressable>
  );
}

function DynamicFeature({ attraction }: AttractionDetailsViewProps) {
  if (attraction.houseArauzVideo) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={attraction.houseArauzVideo.title}
        onPress={() => Alert.alert('HOUSE ARAUZ Video', 'The video card is ready. The final video link can be connected when supplied.')}
        style={({ pressed }) => [styles.videoCard, pressed && styles.pressed]}
      >
        <ImageBackground source={videoBackground} resizeMode="cover" style={styles.videoImage} imageStyle={styles.featureImageRadius}>
          <View style={styles.featureShade} />
          <View style={styles.playButton}><Ionicons name="play" size={24} color={colors.text} /></View>
        </ImageBackground>
        <View style={styles.featureCopy}>
          <Text style={styles.featureEyebrow}>{attraction.houseArauzVideo.subtitle}</Text>
          <Text style={styles.featureTitle}>{attraction.houseArauzVideo.title}</Text>
          <Text style={styles.featureText}>Local video guide</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color={colors.text} />
      </Pressable>
    );
  }

  return (
    <View style={styles.factCard}>
      <View style={styles.factIcon}><Ionicons name="book" size={25} color={colors.gold} /></View>
      <View style={styles.factCopy}>
        <Text style={styles.featureEyebrow}>Did You Know?</Text>
        <Text style={styles.featureTitle}>A piece of Salem history</Text>
        <Text style={styles.featureText}>{attraction.historicalFact}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing.xxxl, gap: spacing.md },
  hero: { height: 320, overflow: 'hidden', padding: spacing.lg },
  heroPhoto: { position: 'absolute', inset: 0, width: '100%', height: '100%' },
  heroShade: { position: 'absolute', inset: 0, backgroundColor: 'rgba(4, 3, 8, 0.12)' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { flexDirection: 'row', alignItems: 'center', minWidth: 78, minHeight: 42, borderRadius: radius.pill, backgroundColor: 'rgba(4, 3, 8, 0.7)', paddingRight: spacing.md },
  backText: { color: colors.text, fontSize: 15, fontWeight: '800' },
  brand: { ...typography.title, fontSize: 22, lineHeight: 28, textTransform: 'uppercase', textShadowColor: colors.black, textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  brandStar: { color: colors.gold, fontSize: 16 },
  iconButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, backgroundColor: 'rgba(4, 3, 8, 0.7)' },
  heroCopy: { marginHorizontal: spacing.lg, backgroundColor: '#0E0B14', borderWidth: 1, borderColor: '#3D3048', borderRadius: radius.md, padding: spacing.md },
  location: { ...typography.eyebrow, color: colors.text, fontSize: 9.5, letterSpacing: 1.6 },
  name: { ...typography.display, fontSize: 32, lineHeight: 37, marginTop: spacing.xs },
  description: { ...typography.body, color: '#EFE7DE', fontSize: 14, lineHeight: 19, marginTop: spacing.xs },
  primaryInfo: { marginHorizontal: spacing.lg, gap: spacing.sm },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  infoText: { ...typography.body, flex: 1, fontSize: 14, lineHeight: 20 },
  statusText: { color: colors.gold, fontSize: 14, fontWeight: '900' },
  openText: { color: '#78E567' },
  hours: { color: colors.textMuted, fontSize: 14 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  tag: { backgroundColor: '#241A2C', borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 5 },
  tagText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  waitInfoCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginHorizontal: spacing.lg, borderWidth: 1, borderColor: '#4A6695', borderRadius: radius.md, backgroundColor: '#0D1625', padding: spacing.md },
  waitInfoMain: { minWidth: 0, flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  waitInfoCopy: { minWidth: 0, flex: 1 },
  waitInfoLabel: { ...typography.eyebrow, color: colors.textMuted, fontSize: 9, letterSpacing: 1.2 },
  waitInfoValue: { color: colors.text, fontSize: 16, lineHeight: 21, fontWeight: '900' },
  waitInfoMeta: { minWidth: 102, maxWidth: '45%', alignItems: 'flex-end' },
  waitCrowd: { fontSize: 12, fontWeight: '900' },
  waitFreshness: { color: colors.textMuted, fontSize: 9.5, lineHeight: 13, textAlign: 'right' },
  waitQuickStatus: { maxWidth: '100%', color: colors.gold, fontSize: 9.5, lineHeight: 13, marginTop: 2 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginHorizontal: spacing.lg },
  actionButton: { ...shadows.card, width: '48.8%', minHeight: 106, alignItems: 'center', justifyContent: 'center', backgroundColor: '#10101A', borderWidth: 1, borderColor: '#51415F', borderRadius: radius.md, padding: spacing.sm },
  pressed: { opacity: 0.76, transform: [{ scale: 0.98 }] },
  actionTitle: { color: colors.text, fontSize: 14, lineHeight: 19, fontWeight: '900', textTransform: 'uppercase', marginTop: spacing.xs },
  actionSubtitle: { color: colors.textMuted, fontSize: 11, lineHeight: 15 },
  infoCards: { flexDirection: 'row', gap: spacing.sm, marginHorizontal: spacing.lg },
  contentCard: { flex: 1, minHeight: 190, backgroundColor: '#0D111A', borderWidth: 1, borderColor: '#46516D', borderRadius: radius.md, padding: spacing.md },
  cardHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardTitle: { ...typography.title, fontSize: 19, lineHeight: 24 },
  rule: { height: 1, backgroundColor: colors.borderSoft, marginVertical: spacing.sm },
  bodyText: { ...typography.body, color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.sm },
  tipText: { ...typography.caption, flex: 1, fontSize: 12, lineHeight: 17 },
  videoCard: { ...shadows.card, minHeight: 136, flexDirection: 'row', alignItems: 'center', gap: spacing.md, overflow: 'hidden', marginHorizontal: spacing.lg, backgroundColor: '#0D0B12', borderWidth: 1, borderColor: '#53405F', borderRadius: radius.md, paddingRight: spacing.md },
  videoImage: { width: 132, minHeight: 136, alignItems: 'center', justifyContent: 'center' },
  featureImageRadius: { borderTopLeftRadius: radius.md - 1, borderBottomLeftRadius: radius.md - 1 },
  featureShade: { position: 'absolute', inset: 0, backgroundColor: 'rgba(5, 3, 9, 0.2)' },
  playButton: { width: 52, height: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#F17B67', borderRadius: radius.sm, backgroundColor: 'rgba(4, 3, 8, 0.68)' },
  featureCopy: { flex: 1 },
  featureEyebrow: { ...typography.eyebrow, color: colors.gold, fontSize: 9.5, letterSpacing: 1.5 },
  featureTitle: { ...typography.heading, fontSize: 16, lineHeight: 21, marginTop: 2 },
  featureText: { ...typography.caption, fontSize: 11.5, lineHeight: 16, marginTop: 3 },
  factCard: { ...shadows.card, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, marginHorizontal: spacing.lg, backgroundColor: '#15101D', borderWidth: 1, borderColor: '#5A4565', borderRadius: radius.md, padding: spacing.lg },
  factIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: '#2D2217' },
  factCopy: { flex: 1 },
});
