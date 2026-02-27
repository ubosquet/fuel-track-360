import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'demo-key',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'demo.firebaseapp.com',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-project',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:000:web:000',
};

let _app: FirebaseApp | undefined;
let _auth: Auth | undefined;

if (typeof window !== 'undefined') {
    _app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    _auth = getAuth(_app);
}

/**
 * N12 FIX: Safe accessor — throws a clear error if called in a server-side context
 * instead of silently returning undefined and causing a cryptic TypeError later.
 * All callers are already in 'use client' components, so this should never throw in practice.
 */
export function getFirebaseAuth(): Auth {
    if (!_auth) {
        throw new Error(
            '[firebase] getFirebaseAuth() called in a server-side context. ' +
            'Firebase Auth is a client-only feature. ' +
            'Make sure your component or module has "use client" at the top.',
        );
    }
    return _auth;
}

// Convenience re-export for existing client-side callers (api.ts interceptor, AuthContext)
export const auth = _auth as Auth;
export const app = _app as FirebaseApp;

