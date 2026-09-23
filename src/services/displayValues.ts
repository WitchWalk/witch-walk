const unavailableDistanceValues = new Set([
  'distance unavailable',
  'unavailable',
  'unknown',
  'n/a',
  'na',
  '—',
  '-',
]);

export function validDistanceLabel(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const label = value.trim();
  if (!label || unavailableDistanceValues.has(label.toLowerCase())) return null;

  const numeric = Number.parseFloat(label);
  if (!Number.isFinite(numeric) || numeric < 0) return null;
  return label;
}

export function distanceMilesLabel(value: unknown): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
  return `${value.toFixed(1)} mi`;
}
