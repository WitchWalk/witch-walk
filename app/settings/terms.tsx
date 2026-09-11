import { SettingsInfoScreen } from '@/components/settings/SettingsInfoScreen';
import { settingsContent } from '@/config/settingsContent';

export default function TermsScreen() {
  return <SettingsInfoScreen {...settingsContent.terms} />;
}
