const SUPABASE_ENVIRONMENT_VARIABLES = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
] as const;

type Environment = Record<string, string | undefined>;

export function getSupabaseConfig(environment: Environment) {
  const missingVariables = SUPABASE_ENVIRONMENT_VARIABLES.filter(
    (name) => !environment[name]?.trim(),
  );

  if (missingVariables.length) {
    throw new Error(
      `[Supabase configuration] Missing ${missingVariables.join(', ')}. Add the missing value${missingVariables.length === 1 ? '' : 's'} to the .env file in the Witch Walk project root and restart Expo.`,
    );
  }

  return {
    url: environment.EXPO_PUBLIC_SUPABASE_URL!.trim(),
    publishableKey: environment.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!.trim(),
  };
}
