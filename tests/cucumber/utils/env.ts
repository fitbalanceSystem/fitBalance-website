export type Environment = 'local' | 'staging' | 'production';

export interface EnvConfig {
  env:           Environment;
  baseUrl:       string;
  supabaseUrl:   string;
  supabaseKey:   string;
  adminEmail:    string;
  adminPassword: string;
}

const BASE_URLS: Record<Environment, string> = {
  local:      'http://localhost:3000',
  staging:    'https://staging.fitbalance.co.il',
  production: 'https://fitbalance.co.il',
};

export function getEnvConfig(): EnvConfig {
  const env = (process.env.ENV ?? 'local') as Environment;

  if (!BASE_URLS[env]) {
    throw new Error(`Unknown ENV "${env}". Valid values: local | staging | production`);
  }

  return {
    env,
    baseUrl:       BASE_URLS[env],
    supabaseUrl:   process.env.SUPABASE_URL    ?? '',
    supabaseKey:   process.env.SUPABASE_KEY    ?? '',
    adminEmail:    process.env.ADMIN_EMAIL     ?? '',
    adminPassword: process.env.ADMIN_PASSWORD  ?? '',
  };
}
