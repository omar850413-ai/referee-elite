
'use client';

import React, { useState, useEffect, useContext, createContext, ReactNode } from 'react';
import { User, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/firebase/client';
import { doc, getDoc, setDoc, Timestamp, serverTimestamp } from 'firebase/firestore';
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
          // If user doc doesn't exist or they are not approved, they shouldn't be logged in.
          setUser(null);
          if (auth.currentUser) {
            await firebaseSignOut(auth);
          }
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
    const firebaseUser = userCredential.user;
    const userDocRef = doc(db, 'users', firebaseUser.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists() || !userDoc.data().approved) {
      await firebaseSignOut(auth); // Sign out the user
      throw new Error('Tu cuenta está pendiente de aprobación por un administrador.');
    }
    // Auth state change will handle setting the user
    return userCredential;
  };

  const signUp = async (email: string, pass: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    const newUser = userCredential.user;
    
    try {
      const isAutoApproved = ADMIN_EMAILS.includes(newUser.email!);
      const userDocRef = doc(db, 'users', newUser.uid);
      await setDoc(userDocRef, {
        uid: newUser.uid,
        email: newUser.email,
        approved: isAutoApproved,
        createdAt: Timestamp.now(),
        // Add any other default fields here
      });
      
      // Sign out immediately after profile creation to enforce approval flow
      await firebaseSignOut(auth);

    } catch (error) {
        // If profile creation fails, we should not leave an orphaned auth user.
        // It's safer to delete the user and have them try again.
        if (auth.currentUser) {
            // await auth.currentUser.delete(); // This requires recent sign-in, might be complex
        }
        // Also sign them out
        await firebaseSignOut(auth);
        console.error("Error creating user profile:", error);
        throw new Error("No se pudo crear el perfil de usuario durante el registro.");
    }
    
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
