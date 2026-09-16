import {
  APPROVED_CROWD_LEVELS,
  WAIT_REPORT_RECENT_WINDOW_MILLISECONDS,
  type ApprovedCrowdLevel,
  type WaitTimeAggregate,
} from './waitReportCore';

export const DOWNTOWN_SALEM_WAIT_ATTRACTION_IDS = [
  'salem-witch-museum',
  'witch-house',
  'house-seven-gables',
  'peabody-essex-museum',
  'witch-dungeon-museum',
  'salem-maritime',
] as const;

export const DOWNTOWN_CROWD_MINIMUM_FRESH_ATTRACTIONS = 2;

export type DowntownCrowdStatus =
  | { kind: 'crowd'; level: ApprovedCrowdLevel; contributingAttractionCount: number }
  | { kind: 'no-data'; contributingAttractionCount: number }
  | { kind: 'unavailable'; contributingAttractionCount: 0 };

type DowntownCrowdOptions = {
  now?: number;
  liveStatusUnavailable?: boolean;
  minimumFreshAttractions?: number;
};

const crowdPriority: Record<ApprovedCrowdLevel, number> = {
  light: 0,
  moderate: 1,
  busy: 2,
};

export function aggregateDowntownCrowdStatus(
  aggregates: Record<string, WaitTimeAggregate>,
  options: DowntownCrowdOptions = {},
): DowntownCrowdStatus {
  const now = options.now ?? Date.now();
  if (options.liveStatusUnavailable) return { kind: 'unavailable', contributingAttractionCount: 0 };

  const freshLevels = DOWNTOWN_SALEM_WAIT_ATTRACTION_IDS.flatMap((id) => {
    const summary = aggregates[id];
    const timestamp = summary?.newestReportTimestamp;
    if (
      summary?.hasRecentReports !== true ||
      !summary.crowdLevel ||
      !APPROVED_CROWD_LEVELS.includes(summary.crowdLevel) ||
      !Number.isFinite(timestamp) ||
      (timestamp as number) > now ||
      now - (timestamp as number) > WAIT_REPORT_RECENT_WINDOW_MILLISECONDS
    ) return [];
    return [summary.crowdLevel];
  });

  const minimum = options.minimumFreshAttractions ?? DOWNTOWN_CROWD_MINIMUM_FRESH_ATTRACTIONS;
  if (freshLevels.length < minimum) {
    return { kind: 'no-data', contributingAttractionCount: freshLevels.length };
  }

  const counts = Object.fromEntries(APPROVED_CROWD_LEVELS.map((level) => [level, 0])) as Record<ApprovedCrowdLevel, number>;
  freshLevels.forEach((level) => { counts[level] += 1; });
  const level = [...APPROVED_CROWD_LEVELS].sort((a, b) =>
    counts[b] - counts[a] || crowdPriority[b] - crowdPriority[a])[0];

  return { kind: 'crowd', level, contributingAttractionCount: freshLevels.length };
}

export function getDowntownCrowdAccessibilityLabel(status: DowntownCrowdStatus) {
  if (status.kind === 'crowd') {
    return `Downtown Salem is currently ${status.level}. Open the live map.`;
  }
  if (status.kind === 'unavailable') {
    return 'Downtown Salem live status is unavailable. Open the live map.';
  }
  return 'Downtown Salem has no recent crowd data. Open the live map.';
}
