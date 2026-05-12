import { applicationDefault, cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

import { env } from "../config/env.js";

const getPrivateKey = () => env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
const isRunningTests = env.NODE_ENV === "test" || process.env.VITEST === "true";
const isUsingFirebaseEmulator = Boolean(
  !isRunningTests && (env.FIRESTORE_EMULATOR_HOST || env.FIREBASE_AUTH_EMULATOR_HOST),
);
const isCloudRuntime = env.NODE_ENV === "production" && env.FIREBASE_PROJECT_ID;

export const initializeFirebaseAdmin = (): App | null => {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  if (isUsingFirebaseEmulator && env.FIREBASE_PROJECT_ID) {
    return initializeApp({
      projectId: env.FIREBASE_PROJECT_ID,
    });
  }

  if (!isRunningTests && env.GOOGLE_APPLICATION_CREDENTIALS && env.FIREBASE_PROJECT_ID) {
    return initializeApp({
      credential: applicationDefault(),
      projectId: env.FIREBASE_PROJECT_ID,
    });
  }

  if (!isRunningTests && isCloudRuntime) {
    return initializeApp({
      credential: applicationDefault(),
      projectId: env.FIREBASE_PROJECT_ID,
    });
  }

  if (!env.FIREBASE_PROJECT_ID || !env.FIREBASE_CLIENT_EMAIL || !env.FIREBASE_PRIVATE_KEY) {
    return null;
  }

  return initializeApp({
    credential: cert({
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey: getPrivateKey(),
    }),
  });
};

export const firebaseApp = initializeFirebaseAdmin();
export const auth = firebaseApp ? getAuth(firebaseApp) : null;

const firestoreInstance = firebaseApp ? getFirestore(firebaseApp) : null;
if (firestoreInstance) {
  firestoreInstance.settings({ ignoreUndefinedProperties: true });
}
export const db = firestoreInstance;
