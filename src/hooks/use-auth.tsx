
'use client';

import React, { useState, useEffect, useContext, createContext, ReactNode } from 'react';
import { User, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut as firebaseSignOut, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { auth, db } from '@/firebase/client';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { ADMIN_EMAILS } from '@/config/admin';

export interface UserProfile extends User {
  isAdmin?: boolean;
  approved?: boolean;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<any>;
  signUp: (email: string, pass: string) => Promise<any>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            const userData = userDoc.data();
            const userProfile: UserProfile = {
              ...user,
              approved: userData.approved,
              isAdmin: ADMIN_EMAILS.includes(user.email!),
            };
            setUser(userProfile);
        } else {
          // This should ideally not happen for a logged-in user if sign-up is correct
          // but as a fallback, we can create it.
           const isAutoApproved = ADMIN_EMAILS.includes(user.email!);
           const userProfileData = {
              uid: user.uid,
              email: user.email,
              approved: isAutoApproved,
              createdAt: Timestamp.fromDate(new Date()),
            };
           await setDoc(userDocRef, userProfileData);
           setUser({ ...user, ...userProfileData });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, pass: string) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    const user = userCredential.user;
    
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists() || !userDoc.data().approved) {
      // Sign out the user immediately if they are not approved
      await firebaseSignOut(auth);
      // Throw a specific error to be caught by the UI
      throw new Error('Tu cuenta está pendiente de aprobación por un administrador.');
    }
    
    // User is approved, the onAuthStateChanged listener will handle setting the user state.
    return userCredential;
  };

  const signUp = async (email: string, pass: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    const user = userCredential.user;

    const isAutoApproved = ADMIN_EMAILS.includes(user.email!);

    // Create user profile in Firestore immediately after auth creation
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, {
      uid: user.uid,
      email: user.email,
      approved: isAutoApproved,
      createdAt: Timestamp.fromDate(new Date()),
    });

    // Sign out to enforce login and approval flow
    await firebaseSignOut(auth);
    
    return userCredential;
  };

  const signOut = () => {
    return firebaseSignOut(auth).then(() => {
      router.push('/login');
    });
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};
