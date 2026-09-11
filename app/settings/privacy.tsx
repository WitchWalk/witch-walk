import { SettingsInfoScreen } from '@/components/settings/SettingsInfoScreen';
import { settingsContent } from '@/config/settingsContent';

export default function PrivacyPolicyScreen() {
  return <SettingsInfoScreen {...settingsContent.privacy} />;
}
