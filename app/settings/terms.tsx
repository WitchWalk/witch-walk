import { PublicSettingsLinkScreen } from '@/components/settings/PublicSettingsLinkScreen';

export default function TermsScreen() {
  return <PublicSettingsLinkScreen title="Terms of Service" icon="document-text-outline" setting="termsOfServiceUrl" buttonLabel="Open Terms of Service" body="Read the current BROOMSTICK Terms of Service in your browser." />;
}
