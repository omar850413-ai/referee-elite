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
  const { setIsAdmin, isAdmin } = useAdmin(); // Use context to set admin state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isUserLoading) {
      setLoading(true);
      return;
    }

    if (!user) {
      router.push('/login');
      return;
    }
    
    if (user && firestore) {
      const userProfileRef = doc(firestore, 'users', user.uid);
      const adminDocRef = doc(firestore, 'admins', user.uid);

      Promise.all([getDoc(userProfileRef, { source: 'server' }), getDoc(adminDocRef)])
        .then(([profileSnap, adminSnap]) => {
          if (profileSnap.exists()) {
            setProfile(profileSnap.data() as UserProfile);
          } else {
            console.error('No user profile found for logged-in user.');
            handleLogout();
            return;
          }
          
          const userIsAdmin = adminSnap.exists();
          setIsAdmin(userIsAdmin); // Set admin status in context
        })
        .catch((error) => {
          console.error('Error fetching user data:', error);
          handleLogout();
        })
        .finally(() => {
          setLoading(false);
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


  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Cargando...</p>
      </div>
    );
  }

  if (!profile) {
     return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <p className="text-lg">Redireccionando...</p>
        </div>
     );
  }

  if (!isAdmin && !profile.approved) {
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
