'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut as firebaseSignOut,
    User,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import api from '@/lib/api';

interface AppUser {
    uid: string;
    email: string | null;
    displayName: string | null;
    role: string;
    organizationId: string;
    organizationName: string;
}

interface AuthContextType {
    user: AppUser | null;
    firebaseUser: User | null;
    loading: boolean;
    error: string | null;
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
    const [user, setUser] = useState<AppUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
            setFirebaseUser(fbUser);
            if (fbUser) {
                try {
                    const token = await fbUser.getIdToken();
                    const res = await fetch(
                        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'}/auth/me`,
                        { headers: { Authorization: `Bearer ${token}` } },
                    );
                    if (res.ok) {
                        const data = await res.json();
                        setUser({
                            uid: fbUser.uid,
                            email: fbUser.email,
                            displayName: data.data?.full_name || fbUser.displayName,
                            role: data.data?.role || 'DRIVER',
                            organizationId: data.data?.organization_id || '',
                            organizationName: data.data?.organization?.name || '',
                        });
                    }
                } catch {
                    // API may not be available in dev — use Firebase user data
                    setUser({
                        uid: fbUser.uid,
                        email: fbUser.email,
                        displayName: fbUser.displayName,
                        role: 'ADMIN',
                        organizationId: '',
                        organizationName: 'Demo Org',
                    });
                }
            } else {
                setUser(null);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const signIn = async (email: string, password: string) => {
        setError(null);
        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (err: any) {
            setError(err.message || 'Authentication failed');
            setLoading(false);
            throw err;
        }
    };

    const signOut = async () => {
        await firebaseSignOut(auth);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, firebaseUser, loading, error, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
}
