import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { router } from 'expo-router';
import { View, Pressable, Text } from 'react-native';

export default function MoreScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: '#100A18' }}><PlaceholderScreen
      title="More & Settings"
      description="App settings, visitor information, and additional Witch Walk tools will live here."
      icon="options-outline"
    /><Pressable accessibilityRole="button" onPress={() => router.push('/witch-watch')} style={{ padding: 20, margin: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E9B75F' }}><Text style={{ color: '#E9B75F', fontSize: 17 }}>Manage Witch Watch</Text></Pressable></View>
  );
}
