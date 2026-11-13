import { Platform } from 'react-native';

export const PLUS_ENTITLEMENT_ID =
  process.env.EXPO_PUBLIC_BROOMSTICK_PLUS_ENTITLEMENT_ID?.trim() ||
  'broomstick_plus';

export const PLUS_FALLBACK_PRICE =
  process.env.EXPO_PUBLIC_BROOMSTICK_PLUS_PRICE_FALLBACK?.trim() ||
  '$8.99';

type CustomerInfoLike = {
  entitlements?: {
    active?: Record<string, unknown>;
  };
};

type StorePackageLike = {
  identifier?: string;
  packageType?: string;
  product?: {
    identifier?: string;
    priceString?: string;
  };
};

export type PlusStoreSnapshot = {
  configured: boolean;
  active: boolean;
  price: string;
  packageIdentifier: string | null;
};

export type PlusPurchaseResult =
  | { kind: 'purchased'; active: boolean }
  | { kind: 'restored'; active: boolean }
  | { kind: 'cancelled'; active: false }
  | { kind: 'unavailable'; active: false; message: string }
  | { kind: 'error'; active: false; message: string };

let purchasesConfigured = false;

function getApiKey() {
  if (Platform.OS !== 'ios') return null;
  const value =
    process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY?.trim() || '';
  return value || null;
}

function hasPlusEntitlement(info: CustomerInfoLike | null | undefined) {
  return Boolean(
    info?.entitlements?.active?.[PLUS_ENTITLEMENT_ID],
  );
}

async function getPurchases() {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const module = await import('react-native-purchases');
  const Purchases = module.default;

  if (!purchasesConfigured) {
    Purchases.configure({ apiKey });
    purchasesConfigured = true;
  }

  return Purchases;
}

function choosePlusPackage(offerings: unknown): StorePackageLike | null {
  if (!offerings || typeof offerings !== 'object') return null;

  const current = (offerings as {
    current?: {
      lifetime?: StorePackageLike | null;
      availablePackages?: StorePackageLike[];
    } | null;
  }).current;

  if (!current) return null;

  if (current.lifetime) return current.lifetime;

  const available = Array.isArray(current.availablePackages)
    ? current.availablePackages
    : [];

  return (
    available.find((item) =>
      [
        item.identifier,
        item.packageType,
        item.product?.identifier,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes('lifetime'),
    ) ??
    available[0] ??
    null
  );
}

function errorMessage(error: unknown) {
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as { message?: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message;
  }

  return 'The App Store purchase could not be completed.';
}

function userCancelled(error: unknown) {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'userCancelled' in error &&
      (error as { userCancelled?: unknown }).userCancelled === true,
  );
}

export async function getPlusStoreSnapshot(): Promise<PlusStoreSnapshot> {
  const Purchases = await getPurchases();

  if (!Purchases) {
    return {
      configured: false,
      active: false,
      price: PLUS_FALLBACK_PRICE,
      packageIdentifier: null,
    };
  }

  try {
    const [customerInfo, offerings] = await Promise.all([
      Purchases.getCustomerInfo(),
      Purchases.getOfferings(),
    ]);

    const selected = choosePlusPackage(offerings);

    return {
      configured: true,
      active: hasPlusEntitlement(customerInfo),
      price:
        selected?.product?.priceString?.trim() ||
        PLUS_FALLBACK_PRICE,
      packageIdentifier: selected?.identifier ?? null,
    };
  } catch {
    return {
      configured: true,
      active: false,
      price: PLUS_FALLBACK_PRICE,
      packageIdentifier: null,
    };
  }
}

export async function purchaseBroomstickPlus(): Promise<PlusPurchaseResult> {
  const Purchases = await getPurchases();

  if (!Purchases) {
    return {
      kind: 'unavailable',
      active: false,
      message:
        'BROOMSTICK Plus purchasing is not configured on this build yet.',
    };
  }

  try {
    const offerings = await Purchases.getOfferings();
    const selected = choosePlusPackage(offerings);

    if (!selected) {
      return {
        kind: 'unavailable',
        active: false,
        message:
          'BROOMSTICK Plus is not available from the App Store right now.',
      };
    }

    const result = await Purchases.purchasePackage(
      selected as Parameters<typeof Purchases.purchasePackage>[0],
    );

    return {
      kind: 'purchased',
      active: hasPlusEntitlement(result.customerInfo),
    };
  } catch (error) {
    if (userCancelled(error)) {
      return {
        kind: 'cancelled',
        active: false,
      };
    }

    return {
      kind: 'error',
      active: false,
      message: errorMessage(error),
    };
  }
}

export async function restoreBroomstickPlus(): Promise<PlusPurchaseResult> {
  const Purchases = await getPurchases();

  if (!Purchases) {
    return {
      kind: 'unavailable',
      active: false,
      message:
        'Purchase restore is not configured on this build yet.',
    };
  }

  try {
    const customerInfo = await Purchases.restorePurchases();

    return {
      kind: 'restored',
      active: hasPlusEntitlement(customerInfo),
    };
  } catch (error) {
    return {
      kind: 'error',
      active: false,
      message: errorMessage(error),
    };
  }
}
