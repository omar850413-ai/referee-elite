
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
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        let userProfileData: { approved: boolean, isAdmin: boolean };

        if (!userDoc.exists()) {
          // This case handles profile creation on first login
          const isAutoApproved = ADMIN_EMAILS.includes(user.email!);
          userProfileData = { approved: isAutoApproved, isAdmin: isAutoApproved };
          try {
            await setDoc(userDocRef, {
              uid: user.uid,
              email: user.email,
              approved: userProfileData.approved,
              createdAt: Timestamp.fromDate(new Date()),
            });
          } catch (error) {
            console.error("Error creating user profile:", error);
            // Sign out if profile creation fails to prevent being in a broken state
            await firebaseSignOut(auth);
            setUser(null);
            setLoading(false);
            return;
          }
        } else {
          // Existing user
          const userData = userDoc.data();
          userProfileData = {
            approved: userData.approved,
            isAdmin: ADMIN_EMAILS.includes(user.email!),
          };
        }
        
        // If user is not approved, sign them out and prevent setting the user object
        if (!userProfileData.approved) {
           await firebaseSignOut(auth);
           setUser(null);
           setLoading(false);
           // We throw an error that can be caught in the signIn function
           throw new Error('Tu cuenta está pendiente de aprobación por un administrador.');
        }

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
          ...userProfileData,
        };
        setUser(userProfile);

      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, pass: string) => {
    return signInWithEmailAndPassword(auth, email, pass);
  };

  const signUp = async (email: string, pass: string) => {
    // Just create the user in Auth. Profile creation and approval flow is handled by onAuthStateChanged.
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    
    // Sign the user out immediately after creation. They must log in to trigger the profile creation.
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
