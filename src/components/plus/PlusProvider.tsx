import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import {
  getPlusStoreSnapshot,
  PLUS_FALLBACK_PRICE,
  purchaseBroomstickPlus,
  restoreBroomstickPlus,
} from '@/services/plusPurchase';

const DEV_UNLOCK_KEY = '@broomstick/plus-dev-unlock-v1';

type PlusActionResult = {
  success: boolean;
  message: string;
};

type PlusContextValue = {
  ready: boolean;
  configured: boolean;
  hasPlus: boolean;
  storePrice: string;
  busy: boolean;
  devUnlocked: boolean;
  refresh: () => Promise<void>;
  purchase: () => Promise<PlusActionResult>;
  restore: () => Promise<PlusActionResult>;
  setDevUnlocked: (value: boolean) => Promise<void>;
};

const PlusContext = createContext<PlusContextValue | null>(null);

export function PlusProvider({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [storeActive, setStoreActive] = useState(false);
  const [storePrice, setStorePrice] = useState(PLUS_FALLBACK_PRICE);
  const [busy, setBusy] = useState(false);
  const [devUnlocked, setDevUnlockedState] = useState(false);

  const refresh = useCallback(async () => {
    const [snapshot, storedDevUnlock] = await Promise.all([
      getPlusStoreSnapshot(),
      __DEV__
        ? AsyncStorage.getItem(DEV_UNLOCK_KEY)
        : Promise.resolve(null),
    ]);

    setConfigured(snapshot.configured);
    setStoreActive(snapshot.active);
    setStorePrice(snapshot.price);
    setDevUnlockedState(__DEV__ && storedDevUnlock === '1');
    setReady(true);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setDevUnlocked = useCallback(async (value: boolean) => {
    if (!__DEV__) return;

    setDevUnlockedState(value);
    await AsyncStorage.setItem(DEV_UNLOCK_KEY, value ? '1' : '0');
  }, []);

  const purchase = useCallback(async (): Promise<PlusActionResult> => {
    if (busy) {
      return {
        success: false,
        message: 'A purchase is already in progress.',
      };
    }

    setBusy(true);

    try {
      const result = await purchaseBroomstickPlus();

      if (result.kind === 'cancelled') {
        return {
          success: false,
          message: 'Purchase cancelled.',
        };
      }

      if (result.kind === 'purchased') {
        setStoreActive(result.active);
        return result.active
          ? {
              success: true,
              message: 'BROOMSTICK Plus unlocked.',
            }
          : {
              success: false,
              message:
                'The purchase completed, but Plus access has not appeared yet. Try Restore Purchases.',
            };
      }

      return {
        success: false,
        message: result.message,
      };
    } finally {
      setBusy(false);
    }
  }, [busy]);

  const restore = useCallback(async (): Promise<PlusActionResult> => {
    if (busy) {
      return {
        success: false,
        message: 'A purchase action is already in progress.',
      };
    }

    setBusy(true);

    try {
      const result = await restoreBroomstickPlus();

      if (result.kind === 'restored') {
        setStoreActive(result.active);
        return result.active
          ? {
              success: true,
              message: 'BROOMSTICK Plus restored.',
            }
          : {
              success: false,
              message:
                'No BROOMSTICK Plus purchase was found for this App Store account.',
            };
      }

      return {
        success: false,
        message:
          result.kind === 'cancelled'
            ? 'Restore cancelled.'
            : result.message,
      };
    } finally {
      setBusy(false);
    }
  }, [busy]);

  const hasPlus = storeActive || (__DEV__ && devUnlocked);

  const value = useMemo(
    () => ({
      ready,
      configured,
      hasPlus,
      storePrice,
      busy,
      devUnlocked,
      refresh,
      purchase,
      restore,
      setDevUnlocked,
    }),
    [
      ready,
      configured,
      hasPlus,
      storePrice,
      busy,
      devUnlocked,
      refresh,
      purchase,
      restore,
      setDevUnlocked,
    ],
  );

  return (
    <PlusContext.Provider value={value}>
      {children}
    </PlusContext.Provider>
  );
}

export function usePlus() {
  const value = useContext(PlusContext);
  if (!value) {
    throw new Error('usePlus must be used inside PlusProvider');
  }
  return value;
}
