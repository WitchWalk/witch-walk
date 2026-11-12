import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Directory,
  File,
  Paths,
} from 'expo-file-system';

const MANIFEST_KEY = '@broomstick/toursafe-narration-v1';
const TOURSAFE_DIRECTORY = 'broomstick-toursafe';
const EDGE_FUNCTION = 'broomstick-tour-narration';

export type TourNarrationRemote = {
  kind: 'remote';
  attractionId: string;
  title: string;
  audioUrl: string;
  version: string;
  durationSeconds: number | null;
  mimeType: string | null;
  transcript: string | null;
};

export type TourNarrationCached = {
  kind: 'cached';
  attractionId: string;
  title: string;
  localUri: string;
  version: string;
  durationSeconds: number | null;
  mimeType: string | null;
  transcript: string | null;
  cachedAt: number;
};

export type TourNarrationUnavailable = {
  kind: 'unavailable';
  attractionId: string;
  reason:
    | 'not-uploaded'
    | 'not-entitled'
    | 'service-unavailable';
};

export type TourNarrationSource =
  | TourNarrationRemote
  | TourNarrationCached
  | TourNarrationUnavailable;

type TourSafeManifest = Record<
  string,
  Omit<TourNarrationCached, 'kind'>
>;

type NarrationFunctionResponse = {
  status?: 'ready' | 'unavailable' | 'forbidden';
  attractionId?: string;
  title?: string;
  audioUrl?: string;
  audioVersion?: string;
  durationSeconds?: number | null;
  mimeType?: string | null;
  transcript?: string | null;
};

async function readManifest(): Promise<TourSafeManifest> {
  try {
    const raw = await AsyncStorage.getItem(MANIFEST_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as TourSafeManifest;
    return parsed && typeof parsed === 'object'
      ? parsed
      : {};
  } catch {
    return {};
  }
}

async function writeManifest(
  manifest: TourSafeManifest,
) {
  await AsyncStorage.setItem(
    MANIFEST_KEY,
    JSON.stringify(manifest),
  );
}

function cachedFileStillExists(
  entry: TourSafeManifest[string],
) {
  try {
    return new File(entry.localUri).exists;
  } catch {
    return false;
  }
}

export async function getCachedTourNarration(
  attractionId: string,
): Promise<TourNarrationCached | null> {
  const manifest = await readManifest();
  const entry = manifest[attractionId];

  if (!entry) {
    return null;
  }

  if (!cachedFileStillExists(entry)) {
    delete manifest[attractionId];
    await writeManifest(manifest);
    return null;
  }

  return {
    kind: 'cached',
    ...entry,
  };
}

export async function resolveTourNarration(
  attractionId: string,
): Promise<TourNarrationSource> {
  const cached =
    await getCachedTourNarration(attractionId);

  try {
    const { supabase } =
      await import('@/lib/supabase');

    const devToken =
      process.env
        .EXPO_PUBLIC_BROOMSTICK_DEV_NARRATION_TOKEN;

    const { data, error } =
      await supabase.functions.invoke(
        EDGE_FUNCTION,
        {
          body: { attractionId },
          headers:
            __DEV__ && devToken
              ? {
                  'x-broomstick-dev-token':
                    devToken,
                }
              : undefined,
        },
      );

    if (error) {
      return (
        cached ?? {
          kind: 'unavailable',
          attractionId,
          reason: 'service-unavailable',
        }
      );
    }

    const result =
      (data ?? {}) as NarrationFunctionResponse;

    if (result.status === 'forbidden') {
      return {
        kind: 'unavailable',
        attractionId,
        reason: 'not-entitled',
      };
    }

    if (
      result.status !== 'ready' ||
      !result.audioUrl ||
      !result.audioVersion
    ) {
      return (
        cached ?? {
          kind: 'unavailable',
          attractionId,
          reason: 'not-uploaded',
        }
      );
    }

    if (
      cached &&
      cached.version === result.audioVersion
    ) {
      return cached;
    }

    return {
      kind: 'remote',
      attractionId,
      title: result.title ?? 'Tour narration',
      audioUrl: result.audioUrl,
      version: result.audioVersion,
      durationSeconds:
        typeof result.durationSeconds === 'number'
          ? result.durationSeconds
          : null,
      mimeType: result.mimeType ?? null,
      transcript: result.transcript ?? null,
    };
  } catch {
    return (
      cached ?? {
        kind: 'unavailable',
        attractionId,
        reason: 'service-unavailable',
      }
    );
  }
}

function extensionForNarration(
  source: TourNarrationRemote,
) {
  if (source.mimeType === 'audio/mpeg') {
    return 'mp3';
  }

  if (
    source.mimeType === 'audio/mp4' ||
    source.mimeType === 'audio/x-m4a'
  ) {
    return 'm4a';
  }

  if (source.mimeType === 'audio/aac') {
    return 'aac';
  }

  const withoutQuery =
    source.audioUrl.split('?')[0] ?? '';

  const extension =
    withoutQuery.split('.').pop()?.toLowerCase();

  return extension === 'mp3' ||
    extension === 'm4a' ||
    extension === 'aac'
    ? extension
    : 'm4a';
}

function safeFileSegment(value: string) {
  return value.replace(
    /[^a-zA-Z0-9_-]/g,
    '-',
  );
}

export async function cacheTourNarration(
  source: TourNarrationRemote,
): Promise<TourNarrationCached> {
  const directory = new Directory(
    Paths.document,
    TOURSAFE_DIRECTORY,
  );

  directory.create({
    idempotent: true,
    intermediates: true,
  });

  const extension =
    extensionForNarration(source);

  const fileName =
    `${safeFileSegment(source.attractionId)}-${safeFileSegment(source.version)}.${extension}`;

  const destination =
    new File(directory, fileName);

  const downloaded =
    await File.downloadFileAsync(
      source.audioUrl,
      destination,
      { idempotent: true },
    );

  const cached: TourNarrationCached = {
    kind: 'cached',
    attractionId: source.attractionId,
    title: source.title,
    localUri: downloaded.uri,
    version: source.version,
    durationSeconds: source.durationSeconds,
    mimeType: source.mimeType,
    transcript: source.transcript,
    cachedAt: Date.now(),
  };

  const manifest = await readManifest();

  manifest[source.attractionId] = {
    attractionId: cached.attractionId,
    title: cached.title,
    localUri: cached.localUri,
    version: cached.version,
    durationSeconds: cached.durationSeconds,
    mimeType: cached.mimeType,
    transcript: cached.transcript,
    cachedAt: cached.cachedAt,
  };

  await writeManifest(manifest);

  return cached;
}

export async function removeCachedTourNarration(
  attractionId: string,
) {
  const manifest = await readManifest();
  const entry = manifest[attractionId];

  if (entry) {
    try {
      const file = new File(entry.localUri);
      if (file.exists) {
        file.delete();
      }
    } catch {
      // Manifest cleanup still proceeds.
    }
  }

  delete manifest[attractionId];
  await writeManifest(manifest);
}
