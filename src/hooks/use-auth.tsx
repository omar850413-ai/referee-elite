
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut as firebaseSignOut, User } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { ADMIN_EMAILS } from '@/config/admin';
import type { UserProfile } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useAuthContext, useFirestore } from '@/firebase/provider';

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
  const auth = useAuthContext();
  const db = useFirestore();
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
  }, [auth]);

  useEffect(() => {
    if (user) {
      const userDocRef = doc(db, 'users', user.uid);
      const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const profileData = docSnap.data() as UserProfile;
          setUserProfile(profileData);
        } else {
            // This case can happen briefly after signup before the doc is created
            setUserProfile(null);
        }
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      setUserProfile(null);
      setLoading(false);
    }
  }, [user, db]);

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

    try {
        await setDoc(doc(db, 'users', newUser.uid), newUserProfile);
    } catch (error) {
        console.error("Error creating user profile:", error);
        // Optionally, delete the user if profile creation fails
        // await newUser.delete();
        throw new Error("Failed to create user profile.");
    }
    
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
