import { PublicSettingsLinkScreen } from '@/components/settings/PublicSettingsLinkScreen';

export default function PrivacyPolicyScreen() {
  return <PublicSettingsLinkScreen title="Privacy Policy" icon="shield-checkmark-outline" setting="privacyPolicyUrl" buttonLabel="Open Privacy Policy" body="Read the current BROOMSTICK Privacy Policy in your browser." />;
}
