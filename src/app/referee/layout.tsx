'use client';
import React, { useEffect, useState } from 'react';
import { useUser, useFirestore, useAuth } from '@/firebase';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdminProvider, useAdmin } from '@/context/AdminContext';

interface UserProfile {
  approved: boolean;
  displayName: string;
  email: string;
}

function RefereeLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  const auth = useAuth();
  const { setIsAdmin } = useAdmin();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);

  useEffect(() => {
    if (isUserLoading) {
      return;
    }

    if (!user) {
      router.push('/login');
      return;
    }
    
    if (user && firestore) {
      setIsProfileLoading(true);
      const userProfileRef = doc(firestore, 'users', user.uid);
      const adminDocRef = doc(firestore, 'admins', user.uid);

      Promise.all([getDoc(userProfileRef, { source: 'server' }), getDoc(adminDocRef)])
        .then(([profileSnap, adminSnap]) => {
          if (profileSnap.exists()) {
            setProfile(profileSnap.data() as UserProfile);
          } else {
            // This case might happen if the user record exists in Auth but not in Firestore.
            // Logging out is a safe fallback.
            console.error('No user profile found for logged-in user.');
            handleLogout();
            return;
          }
          
          setIsAdmin(adminSnap.exists());
        })
        .catch((error) => {
          console.error('Error fetching user data:', error);
          // Also logout on error to prevent getting stuck
          handleLogout();
        })
        .finally(() => {
          setIsProfileLoading(false);
        });
    }
  }, [user, isUserLoading, firestore, router, setIsAdmin]);
  
  const handleLogout = () => {
    if (auth) {
      signOut(auth).then(() => {
        router.push('/login');
      });
    } else {
      router.push('/login');
    }
  };


  if (isUserLoading || isProfileLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Cargando...</p>
      </div>
    );
  }

  // The check for `profile` is now safer because loading states are handled above.
  // The `isAdmin` check is now implicit through the context. The logic inside useAdmin hook will use the value set from the DB.
  if (profile && !profile.approved) {
    // We need to re-check if the user has become an admin in the meantime.
    if (firestore && user) {
        const adminDocRef = doc(firestore, 'admins', user.uid);
        getDoc(adminDocRef).then(adminSnap => {
            if (!adminSnap.exists()) {
                // If not an admin, show the pending page.
                 // This state will be temporary until the new check completes.
            } else {
                setIsAdmin(true); // Is an admin, update context
            }
        });
    }

    // Immediately check the context value which might have been updated.
    let isAdmin = false;
    // A trick to get the latest value without being in a hook
    const adminContext = {isAdmin: false, setIsAdmin: (val: boolean) => {isAdmin=val}};
    try {
        const {isAdmin: contextAdmin} = useAdmin();
        isAdmin = contextAdmin;
    } catch(e) {
        // useAdmin can fail if context is not ready, we proceed with isAdmin=false
    }
    
    if(!isAdmin) {
        return (
          <div className="flex h-screen flex-col items-center justify-center bg-background p-8 text-center">
            <h1 className="text-3xl font-bold text-primary-dark mb-4">
              Pendiente de Aprobación
            </h1>
            <p className="max-w-md text-muted-foreground mb-8">
              Tu cuenta ha sido registrada, pero necesitas que un administrador la apruebe para poder acceder a la aplicación. Por favor, contacta al administrador.
            </p>
            <Button onClick={handleLogout}>
              Volver a Inicio de Sesión
            </Button>
          </div>
        );
    }
  }
  
  // If profile exists and is approved, or if the user is an admin, render children.
  return <>{children}</>;
}


export default function RefereeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
    return (
        <AdminProvider>
            <RefereeLayoutContent>{children}</RefereeLayoutContent>
        </AdminProvider>
    )
}
