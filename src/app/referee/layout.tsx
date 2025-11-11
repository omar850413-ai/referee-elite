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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If auth is still loading, do nothing yet.
    if (isUserLoading) {
      return;
    }

    // If auth is done and there's no user, redirect to login.
    if (!user) {
      router.push('/login');
      return;
    }

    // If there's a user but firestore is not ready, wait.
    if (!firestore) {
        return;
    }

    // Auth is done and we have a user. Now fetch their data.
    const fetchData = async () => {
      try {
        const userProfileRef = doc(firestore, 'users', user.uid);
        const adminDocRef = doc(firestore, 'admins', user.uid);

        // Fetch both documents from the server to avoid cache issues.
        const [profileSnap, adminSnap] = await Promise.all([
          getDoc(userProfileRef, { source: 'server' }),
          getDoc(adminDocRef, { source: 'server' })
        ]);
        
        if (profileSnap.exists()) {
          setProfile(profileSnap.data() as UserProfile);
        } else {
          setProfile(null);
        }
        
        setIsAdmin(adminSnap.exists());
        
      } catch (error) {
        console.error("Error fetching user data:", error);
        // On error, default to non-admin and no profile to be safe.
        setProfile(null);
        setIsAdmin(false);
      } finally {
        // All data fetching is complete.
        setLoading(false);
      }
    };

    fetchData();
    
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

  // While auth is loading OR while we are fetching profile data, show the spinner.
  if (isUserLoading || loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Cargando...</p>
      </div>
    );
  }

  // After all loading is done, check for approval.
  // A non-existent profile means they are not approved.
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
  
  // If we reach here, the user is either an admin or is an approved user.
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
