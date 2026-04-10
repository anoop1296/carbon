import { App, cert, getApp, getApps, initializeApp } from 'firebase-admin/app';

function readRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing Firebase admin environment variable: ${name}`);
  }
  return value;
}

export function getFirebaseAdminApp(): App {
  if (getApps().length) {
    return getApp();
  }

  return initializeApp({
    credential: cert({
      projectId: readRequiredEnv('FIREBASE_PROJECT_ID'),
      clientEmail: readRequiredEnv('FIREBASE_CLIENT_EMAIL'),
      privateKey: readRequiredEnv('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n'),
    }),
  });
}
