
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
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.approved) {
            const userProfile: UserProfile = {
              ...firebaseUser,
              approved: userData.approved,
              isAdmin: ADMIN_EMAILS.includes(firebaseUser.email!),
            };
            setUser(userProfile);
          } else {
            // User exists but is not approved. Sign them out.
            await firebaseSignOut(auth);
            setUser(null);
            // We throw an error that can be caught in the sign-in process
            throw new Error('Tu cuenta está pendiente de aprobación por un administrador.');
          }
        } else {
          // First time login after sign-up, create the user document.
          const isAutoApproved = ADMIN_EMAILS.includes(firebaseUser.email!);
          const userProfileData = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            approved: isAutoApproved,
            createdAt: Timestamp.fromDate(new Date()),
          };
          await setDoc(userDocRef, userProfileData);

          if (isAutoApproved) {
             setUser({ ...firebaseUser, ...userProfileData });
          } else {
            // Not auto-approved, so sign them out and force approval flow.
             await firebaseSignOut(auth);
             setUser(null);
             throw new Error('Tu cuenta ha sido creada y está pendiente de aprobación.');
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
    try {
      // onAuthStateChanged will handle the rest of the logic.
      // We wrap this in a try/catch to handle specific auth errors.
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      
      // We still need to check for approval status here to reject the promise.
      const userDocRef = doc(db, 'users', userCredential.user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists() && !userDoc.data().approved) {
        await firebaseSignOut(auth); // Ensure they are logged out
        throw new Error('Tu cuenta está pendiente de aprobación por un administrador.');
      }
      
      return userCredential;
    } catch (error: any) {
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            throw new Error('Credenciales incorrectas. Verifica tu correo y contraseña.');
        }
        // Rethrow custom errors or other Firebase errors
        throw error;
    }
  };

  const signUp = async (email: string, pass: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    // Immediately sign out to force the user to log in and trigger the approval flow.
    // The user document will be created on their first login attempt.
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
