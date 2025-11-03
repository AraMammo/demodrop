// Environment variable validation
// This file validates all required environment variables on startup

const REQUIRED_ENV_VARS = {
  // Public environment variables (available in browser)
  public: [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_APP_URL',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  ],

  // Private environment variables (server-side only)
  private: [
    'OPENAI_API_KEY',
    'DUMPLING_API',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
  ],
} as const;

interface ValidationResult {
  valid: boolean;
  missing: string[];
  placeholders: string[];
}

/**
 * Validates that all required environment variables are set
 * Should be called during application startup
 */
export function validateEnvironmentVariables(): ValidationResult {
  const missing: string[] = [];
  const placeholders: string[] = [];

  // Check public variables
  for (const varName of REQUIRED_ENV_VARS.public) {
    const value = process.env[varName];
    if (!value) {
      missing.push(varName);
    } else if (value.includes('placeholder') || value.includes('your-')) {
      placeholders.push(varName);
    }
  }

  // Check private variables (only on server)
  if (typeof window === 'undefined') {
    for (const varName of REQUIRED_ENV_VARS.private) {
      const value = process.env[varName];
      if (!value) {
        missing.push(varName);
      } else if (value.includes('placeholder') || value.includes('your-')) {
        placeholders.push(varName);
      }
    }
  }

  const valid = missing.length === 0 && placeholders.length === 0;

  return { valid, missing, placeholders };
}

/**
 * Validates environment variables and throws an error if any are missing
 * Use this in API routes or server-side code
 */
export function requireEnvironmentVariables() {
  const result = validateEnvironmentVariables();

  if (!result.valid) {
    const errors: string[] = [];

    if (result.missing.length > 0) {
      errors.push(`Missing required environment variables: ${result.missing.join(', ')}`);
    }

    if (result.placeholders.length > 0) {
      errors.push(`Environment variables still have placeholder values: ${result.placeholders.join(', ')}`);
    }

    throw new Error(
      `Environment validation failed:\n${errors.join('\n')}\n\nPlease check your .env.local file and ensure all required variables are set.`
    );
  }
}

/**
 * Logs environment validation warnings without throwing
 * Use this during development
 */
export function checkEnvironmentVariables() {
  const result = validateEnvironmentVariables();

  if (!result.valid) {
    console.warn('⚠️  Environment Variable Validation Warnings:');

    if (result.missing.length > 0) {
      console.warn('   Missing variables:', result.missing);
    }

    if (result.placeholders.length > 0) {
      console.warn('   Placeholder values detected:', result.placeholders);
    }

    console.warn('   Some features may not work correctly.');
  } else {
    console.log('✓ All required environment variables are set');
  }
}
