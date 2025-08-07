// Environment Variables Verification Script
// This file helps verify that all Firebase environment variables are properly loaded

const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_FIREBASE_MEASUREMENT_ID'
];

export function verifyFirebaseConfig() {
  const missingVars: string[] = [];
  const envVars: Record<string, string> = {};

  requiredEnvVars.forEach(varName => {
    const value = import.meta.env[varName];
    if (!value) {
      missingVars.push(varName);
    } else {
      envVars[varName] = value;
    }
  });

  if (missingVars.length > 0) {
    console.error('❌ Missing Firebase environment variables:', missingVars);
    console.error('Please check your .env file and ensure all variables are set.');
    return false;
  }

  // Environment variables loaded successfully

  return true;
}

// Auto-verify on import in development
if (import.meta.env.DEV) {
  verifyFirebaseConfig();
}
