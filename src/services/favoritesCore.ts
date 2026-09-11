export const FAVORITE_CATEGORIES = ['attractions', 'restaurants', 'parking', 'bathrooms'] as const;

export type FavoriteCategory = (typeof FAVORITE_CATEGORIES)[number];

export type FavoriteReference = {
  category: FavoriteCategory;
  id: string;
};

export function favoriteKey(reference: FavoriteReference) {
  return `${reference.category}:${reference.id}`;
}

function isFavoriteCategory(value: unknown): value is FavoriteCategory {
  return typeof value === 'string' && FAVORITE_CATEGORIES.some((category) => category === value);
}

export function normalizeFavoriteReferences(value: unknown): FavoriteReference[] {
  if (!Array.isArray(value)) return [];

  const unique = new Map<string, FavoriteReference>();
  value.forEach((entry) => {
    if (!entry || typeof entry !== 'object') return;
    const candidate = entry as Record<string, unknown>;
    if (!isFavoriteCategory(candidate.category) || typeof candidate.id !== 'string') return;
    const id = candidate.id.trim();
    if (!id) return;
    const reference = { category: candidate.category, id };
    unique.set(favoriteKey(reference), reference);
  });

  return [...unique.values()];
}

export function toggleFavoriteReference(
  references: FavoriteReference[],
  reference: FavoriteReference,
) {
  const key = favoriteKey(reference);
  return references.some((item) => favoriteKey(item) === key)
    ? references.filter((item) => favoriteKey(item) !== key)
    : [...references, reference];
}
