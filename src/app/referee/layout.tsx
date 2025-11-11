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
  const { isAdmin, setIsAdmin } = useAdmin();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);

  useEffect(() => {
    if (isUserLoading) {
      // Still waiting for Firebase Auth to determine the user.
      return;
    }

    if (!user) {
      // No user found, redirect to login.
      router.push('/login');
      return;
    }

    if (!firestore) {
        // Firestore is not ready, wait.
        return;
    }

    // User is authenticated, now fetch their profile and admin status.
    setIsProfileLoading(true);
    const userProfileRef = doc(firestore, 'users', user.uid);
    const adminDocRef = doc(firestore, 'admins', user.uid);

    Promise.all([
      getDoc(userProfileRef, { source: 'server' }), // Force server read
      getDoc(adminDocRef, { source: 'server' })      // Force server read
    ])
    .then(([profileSnap, adminSnap]) => {
      if (profileSnap.exists()) {
        setProfile(profileSnap.data() as UserProfile);
      } else {
        // Profile doesn't exist in Firestore yet. Can happen with new sign-ups.
        // We'll treat them as not approved for now, but we won't log them out.
        setProfile(null); 
      }
      setIsAdmin(adminSnap.exists());
    })
    .catch((error) => {
      console.error('Error fetching user data:', error);
      // On error, we also assume they are not approved/admin to be safe.
      setProfile(null);
      setIsAdmin(false);
    })
    .finally(() => {
      setIsProfileLoading(false);
    });

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

  // While loading auth state OR profile data, show a spinner.
  if (isUserLoading || isProfileLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Cargando...</p>
      </div>
    );
  }

  // After loading, if the user is not an admin AND their profile is not approved, show the pending page.
  // We check for profile existence as well. A non-existent profile is considered not approved.
  if (!isAdmin && (!profile || !profile.approved)) {
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
  
  // If we've reached this point, the user is either an admin or has an approved profile.
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
