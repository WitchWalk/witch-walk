import { SettingsInfoScreen } from '@/components/settings/SettingsInfoScreen';
import { settingsContent } from '@/config/settingsContent';

export default function AboutScreen() {
  return <SettingsInfoScreen {...settingsContent.about} />;
}
