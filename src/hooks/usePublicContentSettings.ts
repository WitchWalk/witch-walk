import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { EMPTY_PUBLIC_SETTINGS, type PublicSettings } from '@/services/publicSettingsCore';
import { loadPublicSettings } from '@/services/publicSettingsRepository';

export function usePublicContentSettings() {
  const [settings, setSettings] = useState<PublicSettings>(EMPTY_PUBLIC_SETTINGS);
  const [ready, setReady] = useState(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    void loadPublicSettings().then((result) => {
      if (active) setSettings(result.settings);
    }).finally(() => {
      if (active) setReady(true);
    });
    return () => { active = false; };
  }, []));

  return { settings, ready };
}
