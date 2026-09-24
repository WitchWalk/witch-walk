import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Image, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText as Text } from '@/components/AppText';
import { useEvents } from '@/components/events/EventsProvider';
import { getEventDateLabel, getEventDirectionsUrl, getEventTimeLabel, type EventLocation } from '@/services/eventContentCore';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export default function EventDetailsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getEvent, ready } = useEvents();
  const event = getEvent(id);
  if (!event) return <SafeAreaView edges={['top']} style={styles.safeArea}><View style={styles.unavailable}>
    <Text style={styles.heading}>{ready ? 'Event unavailable' : 'Loading event…'}</Text>
    <Text style={styles.body}>{ready ? 'This event is not currently published.' : 'Checking the latest Salem events.'}</Text>
    <EventAction label="Back to Events" onPress={() => router.replace('/events')} />
  </View></SafeAreaView>;
  return <EventDetailsView event={event} />;
}
export function EventDetailsView({ event }: { event: EventLocation }) {
  const openUrl = async (url: string | null, label: string) => {
    if (!url) return;
    try { await Linking.openURL(url); }
    catch { Alert.alert(`Unable to open ${label}`, 'Please try again later.'); }
  };
  const goBack = () => router.canGoBack() ? router.back() : router.replace('/events');
  const directions = getEventDirectionsUrl(event);
  return <SafeAreaView edges={['top']} style={styles.safeArea}><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Back to Events" onPress={goBack} style={styles.back}>
      <Ionicons color={colors.text} name="chevron-back" size={25} /><Text style={styles.backText}>Back</Text>
    </Pressable><Text style={styles.brand}>BROOMSTICK</Text></View>
    <Image resizeMode="cover" source={event.image} style={styles.hero} />
    <View style={styles.panel}>
      {event.featured ? <Text style={styles.featured}>Featured Event</Text> : null}
      <Text style={styles.heading}>{event.title}</Text><Text style={styles.category}>{event.category}</Text>
      {event.venue ? <DetailRow icon="location-outline" value={event.venue} /> : null}
      {event.address ? <DetailRow icon="navigate-outline" value={event.address} /> : null}
      {event.cost ? <DetailRow icon="pricetag-outline" value={event.cost} /> : null}
    </View>
    <View style={styles.panel}><Text style={styles.panelTitle}>Dates</Text>
      {event.occurrences.map((occurrence) => <View key={occurrence.id} style={styles.occurrence}>
        <DetailRow icon="calendar-outline" value={getEventDateLabel(occurrence)} />
        <DetailRow icon="time-outline" value={getEventTimeLabel(occurrence)} />
        {occurrence.note ? <Text style={styles.occurrenceNote}>{occurrence.note}</Text> : null}
      </View>)}
    </View>
    {event.fullDescription ? <View style={styles.panel}><Text style={styles.panelTitle}>About</Text><Text style={styles.body}>{event.fullDescription}</Text></View> : null}
    {event.audience ? <View style={styles.panel}><Text style={styles.panelTitle}>Visitor information</Text><Text style={styles.body}>{event.audience}</Text></View> : null}
    {event.recurringNote ? <View style={styles.panel}><Text style={styles.panelTitle}>Schedule note</Text><Text style={styles.body}>{event.recurringNote}</Text></View> : null}
    <View style={styles.actions}>
      {event.ticketUrl ? <EventAction label="Get Tickets" primary onPress={() => void openUrl(event.ticketUrl, 'ticket page')} /> : null}
      {event.websiteUrl ? <EventAction label="Event Website" onPress={() => void openUrl(event.websiteUrl, 'event website')} /> : null}
      {directions ? <EventAction label="Directions" onPress={() => void openUrl(directions, 'maps')} /> : null}
    </View>
  </ScrollView></SafeAreaView>;
}
function DetailRow({ icon, value }: { icon: React.ComponentProps<typeof Ionicons>['name']; value: string }) {
  return <View style={styles.detail}><Ionicons color={colors.gold} name={icon} size={18} /><Text style={styles.body}>{value}</Text></View>;
}
function EventAction({ label, onPress, primary = false }: { label: string; onPress: () => void; primary?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={[styles.action, primary && styles.primary]}>
    <Text style={[styles.actionText, primary && styles.primaryText]}>{label}</Text>
    <Ionicons color={primary ? colors.black : colors.gold} name="arrow-forward" size={17} />
  </Pressable>;
}
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 58 },
  back: { minHeight: 42, flexDirection: 'row', alignItems: 'center' }, backText: { color: colors.text, fontWeight: '700' },
  brand: { ...typography.title, color: colors.gold, fontSize: 21 }, hero: { width: '100%', height: 240, borderRadius: radius.md },
  panel: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.backgroundRaised, padding: spacing.lg, gap: spacing.sm },
  featured: { ...typography.eyebrow }, heading: { ...typography.title }, panelTitle: { ...typography.heading }, occurrence: { gap: spacing.xs, paddingVertical: spacing.xs }, occurrenceNote: { ...typography.caption, color: colors.textMuted, marginLeft: 26 },
  category: { ...typography.caption, color: colors.lavender }, detail: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  body: { ...typography.body, flex: 1 }, actions: { gap: spacing.sm },
  action: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: colors.gold, borderRadius: radius.md, paddingHorizontal: spacing.lg },
  primary: { backgroundColor: colors.gold }, actionText: { color: colors.gold, fontWeight: '800' }, primaryText: { color: colors.black },
  unavailable: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
});
