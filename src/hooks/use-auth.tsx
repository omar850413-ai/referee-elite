
'use client';

import React, { useState, useEffect, useContext, createContext, ReactNode } from 'react';
import { User, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists() && userDoc.data().approved) {
            const userData = userDoc.data();
            const userProfile: UserProfile = {
              ...firebaseUser,
              approved: userData.approved,
              isAdmin: ADMIN_EMAILS.includes(firebaseUser.email!),
            };
            setUser(userProfile);
        } else {
            // User is not approved or doc doesn't exist, sign them out.
            await firebaseSignOut(auth);
            setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, pass: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      const userDocRef = doc(db, 'users', userCredential.user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists() || !userDoc.data().approved) {
        await firebaseSignOut(auth);
        throw new Error('Tu cuenta está pendiente de aprobación por un administrador.');
      }
      
      return userCredential;
    } catch (error: any) {
        if (error.message.includes('pendiente de aprobación')) {
            throw error;
        }
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            throw new Error('Credenciales incorrectas. Verifica tu correo y contraseña.');
        }
        throw new Error('Ocurrió un error inesperado al iniciar sesión.');
    }
  };

  const signUp = async (email: string, pass: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    const newUser = userCredential.user;

    const isAutoApproved = ADMIN_EMAILS.includes(newUser.email!);
    const userProfileData = {
        uid: newUser.uid,
        email: newUser.email,
        approved: isAutoApproved,
        createdAt: Timestamp.fromDate(new Date()),
    };

    const userDocRef = doc(db, 'users', newUser.uid);
    await setDoc(userDocRef, userProfileData);

    // After successfully creating the profile, sign the user out to enforce the approval flow.
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
