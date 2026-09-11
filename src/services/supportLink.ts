import { Linking } from 'react-native';

import { SUPPORT_URL } from '@/config/appLinks';
import { openExternalUrl, type ExternalUrlOpener } from '@/services/supportLinkCore';

export async function openSupportPage(opener: ExternalUrlOpener = Linking) {
  return openExternalUrl(SUPPORT_URL, opener);
}
