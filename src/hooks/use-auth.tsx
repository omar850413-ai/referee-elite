
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut as firebaseSignOut, User } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import firebaseConfig from '@/firebase/config';
import { ADMIN_EMAILS } from '@/config/admin';
import type { UserProfile } from '@/lib/types';
import { useRouter } from 'next/navigation';

// Initialize Firebase
if (!getApps().length) {
  initializeApp(firebaseConfig);
}

const auth = getAuth();
const db = getFirestore();

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  approved: boolean;
  isAdmin: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (email: string, pass: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
          setUserProfile(null);
          setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      const userDocRef = doc(db, 'users', user.uid);
      const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const profileData = docSnap.data() as UserProfile;
          setUserProfile(profileData);
        }
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      setUserProfile(null);
      setLoading(false);
    }
  }, [user]);

  const signUp = async (email: string, pass: string, displayName: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    const newUser = userCredential.user;
    
    const isAdmin = ADMIN_EMAILS.includes(newUser.email || '');

    const newUserProfile: UserProfile = {
      uid: newUser.uid,
      email: newUser.email || '',
      displayName,
      approved: isAdmin, // Admins are auto-approved
      role: isAdmin ? 'admin' : 'user',
    };

    await setDoc(doc(db, 'users', newUser.uid), newUserProfile);
    // Sign out immediately to force them through the approval flow on login
    await firebaseSignOut(auth);
  };
  
  const signIn = async (email: string, pass: string) => {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      const userDocRef = doc(db, 'users', userCredential.user.uid);
      const docSnap = await getDoc(userDocRef);

      if (!docSnap.exists() || !docSnap.data().approved) {
        await firebaseSignOut(auth); // Sign out the unapproved user
        throw new Error('pending-approval');
      }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    router.push('/login');
  };

  const approved = !!userProfile?.approved;
  const isAdmin = userProfile?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, approved, isAdmin, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
