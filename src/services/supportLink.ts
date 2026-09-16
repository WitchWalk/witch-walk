import { Linking } from 'react-native';

import { validatePublicHttpsUrl } from '@/services/publicSettingsCore';
import { openExternalUrl, type ExternalUrlOpener } from '@/services/supportLinkCore';

export async function openSupportPage(url: string, opener: ExternalUrlOpener = Linking) {
  const safeUrl = validatePublicHttpsUrl(url);
  return safeUrl ? openExternalUrl(safeUrl, opener) : false;
}
