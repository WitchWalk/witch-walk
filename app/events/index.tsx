import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText as Text } from '@/components/AppText';
import { useEvents } from '@/components/events/EventsProvider';
import { getEventDateLabel, getEventTimeLabel, getNextUpcomingOccurrence, getUpcomingEvents, type EventLocation } from '@/services/eventContentCore';
import { colors, radius, shadows, spacing, typography } from '@/theme/tokens';

export default function EventsScreen() {
  const { events, ready, refresh } = useEvents();
  const [refreshing, setRefreshing] = useState(false);
  const [clock, setClock] = useState(() => Date.now());
  useFocusEffect(useCallback(() => {
    setClock(Date.now());
    void refresh();
    const timer = setInterval(() => setClock(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, [refresh]));
  const upcoming = useMemo(() => getUpcomingEvents(events, new Date(clock)), [events, clock]);
  const goBack = () => router.canGoBack() ? router.back() : router.replace('/');
  return <SafeAreaView edges={['top']} style={styles.safeArea}>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}
      refreshControl={<RefreshControl tintColor={colors.gold} refreshing={refreshing} onRefresh={() => {
        setRefreshing(true); void refresh(true).finally(() => setRefreshing(false));
      }} />}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to Home" hitSlop={10} onPress={goBack} style={styles.backButton}>
          <Ionicons color={colors.text} name="chevron-back" size={25} />
        </Pressable>
        <Text style={styles.brand}>BROOMSTICK</Text><View style={styles.backButton} />
      </View>
      <View style={styles.intro}><Text style={styles.title}>Events</Text><Text style={styles.subtitle}>Upcoming events in Salem.</Text></View>
      {!ready ? <View style={styles.empty}><Text style={styles.emptyTitle}>Loading events…</Text></View>
        : upcoming.length ? <View style={styles.list}>{upcoming.map(event => <EventCard key={event.id} event={event} now={new Date(clock)} />)}</View>
        : <View style={styles.empty}><Ionicons color={colors.gold} name="calendar-outline" size={38} />
          <Text style={styles.emptyTitle}>No upcoming events</Text>
          <Text style={styles.emptyText}>Check back for newly published Salem events.</Text>
        </View>}
    </ScrollView>
  </SafeAreaView>;
}
function EventCard({ event, now }: { event: EventLocation; now: Date }) {
  const occurrence = getNextUpcomingOccurrence(event, now);
  if (!occurrence) return null;
  return <Pressable accessibilityRole="button" accessibilityLabel={`View ${event.title} details`}
    onPress={() => router.push({ pathname: '/events/[id]', params: { id: event.id } })}
    style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
    <Image resizeMode="cover" source={event.image} style={styles.photo} />
    <View style={styles.cardContent}>
      {event.featured ? <Text style={styles.featured}>Featured Event</Text> : null}
      <Text style={styles.cardTitle}>{event.title}</Text>
      <View style={styles.meta}><Ionicons color={colors.gold} name="calendar-outline" size={15} /><Text style={styles.metaText}>{getEventDateLabel(occurrence)}</Text></View>
      <View style={styles.meta}><Ionicons color={colors.gold} name="time-outline" size={15} /><Text style={styles.metaText}>{getEventTimeLabel(occurrence)}</Text></View>
      {event.venue ? <View style={styles.meta}><Ionicons color={colors.orange} name="location-outline" size={15} /><Text style={styles.metaText}>{event.venue}</Text></View> : null}
      <Text style={styles.category}>{event.category}</Text>
      {event.shortDescription ? <Text numberOfLines={3} style={styles.description}>{event.shortDescription}</Text> : null}
      <View style={styles.detailsRow}><Text style={styles.detailsText}>View Details</Text><Ionicons color={colors.gold} name="chevron-forward" size={18} /></View>
    </View>
  </Pressable>;
}
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 58 },
  backButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  brand: { ...typography.title, color: colors.gold, fontSize: 21 },
  intro: { paddingBottom: spacing.sm }, title: { ...typography.display },
  subtitle: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs },
  list: { gap: spacing.md },
  card: { ...shadows.card, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.backgroundRaised },
  pressed: { opacity: 0.8 }, photo: { width: '100%', height: 160 },
  cardContent: { padding: spacing.lg, gap: spacing.sm }, featured: { ...typography.eyebrow },
  cardTitle: { ...typography.title, fontSize: 22, lineHeight: 27 },
  meta: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  metaText: { ...typography.caption, color: colors.text, flex: 1 },
  category: { ...typography.caption, color: colors.lavender }, description: { ...typography.caption },
  detailsRow: { alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderWidth: 1, borderColor: colors.gold, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  detailsText: { color: colors.gold, fontWeight: '800' },
  empty: { alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.borderSoft, borderRadius: radius.md, backgroundColor: colors.surface, padding: spacing.xl },
  emptyTitle: { ...typography.heading, textAlign: 'center' }, emptyText: { ...typography.caption, textAlign: 'center' },
});
