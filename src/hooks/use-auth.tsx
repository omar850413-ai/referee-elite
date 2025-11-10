
'use client';

import React, { useState, useEffect, useContext, createContext, ReactNode } from 'react';
import { User, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/firebase/client';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
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
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const userProfile: UserProfile = {
            ...user,
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            emailVerified: user.emailVerified,
            phoneNumber: user.phoneNumber,
            isAnonymous: user.isAnonymous,
            tenantId: user.tenantId,
            providerData: user.providerData,
            metadata: user.metadata,
            providerId: user.providerId,
            toJSON: () => ({}),
            approved: userData.approved,
            isAdmin: ADMIN_EMAILS.includes(user.email!),
          };
          setUser(userProfile);
        } else {
          // This case might happen if the user doc creation failed after sign up.
          // For now, we treat them as a regular user without special properties.
           const userProfile: UserProfile = {
            ...user,
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            emailVerified: user.emailVerified,
            phoneNumber: user.phoneNumber,
            isAnonymous: user.isAnonymous,
            tenantId: user.tenantId,
            providerData: user.providerData,
            metadata: user.metadata,
            providerId: user.providerId,
            toJSON: () => ({}),
            approved: false, // Default to not approved
            isAdmin: ADMIN_EMAILS.includes(user.email!),
          };
          setUser(userProfile);
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
    const userDocRef = doc(db, 'users', userCredential.user.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists() && userDoc.data().approved) {
      return userCredential;
    } else {
      await firebaseSignOut(auth);
      throw new Error('Tu cuenta está pendiente de aprobación por un administrador.');
    }
  };

  const signUp = async (email: string, pass: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    const user = userCredential.user;
    
    // Create a document in Firestore for the new user
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, {
      uid: user.uid,
      email: user.email,
      approved: ADMIN_EMAILS.includes(user.email!), // Admin users are auto-approved
      createdAt: new Date(),
    });
    
    // Sign the user out immediately after registration
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
