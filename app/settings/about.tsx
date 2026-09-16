import { SettingsInfoScreen } from '@/components/settings/SettingsInfoScreen';
import { usePublicContentSettings } from '@/hooks/usePublicContentSettings';

export default function AboutScreen() {
  const { settings, ready } = usePublicContentSettings();
  return <SettingsInfoScreen title="About BROOMSTICK" icon="moon-outline" body={settings.aboutBroomstickText ?? (ready ? 'About information is unavailable right now.' : 'Loading…')} />;
}
