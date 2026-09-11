import { createContext, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';

import {
  appSettingsRepository,
  defaultAppSettings,
  type AppSettings,
} from '@/services/appSettingsRepository';

type SettingsContextValue = {
  settings: AppSettings;
  ready: boolean;
  updateSettings: (changes: Partial<AppSettings>) => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue>({
  settings: defaultAppSettings,
  ready: false,
  updateSettings: async () => undefined,
});

export function AppSettingsProvider({ children }: PropsWithChildren) {
  const [settings, setSettings] = useState(defaultAppSettings);
  const [ready, setReady] = useState(false);
  const current = useRef(defaultAppSettings);
  const queue = useRef(Promise.resolve());

  useEffect(() => {
    let active = true;
    queue.current = queue.current.then(async () => {
      const stored = await appSettingsRepository.load();
      current.current = stored;
      if (active) {
        setSettings(stored);
        setReady(true);
      }
    });
    return () => { active = false; };
  }, []);

  const updateSettings = (changes: Partial<AppSettings>) => {
    const task = queue.current.then(async () => {
      const next = { ...current.current, ...changes };
      await appSettingsRepository.save(next);
      current.current = next;
      setSettings(next);
    });
    queue.current = task.catch(() => undefined);
    return task;
  };

  return (
    <SettingsContext.Provider value={{ settings, ready, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useAppSettings = () => useContext(SettingsContext);
