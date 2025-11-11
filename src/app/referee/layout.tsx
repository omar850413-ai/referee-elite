'use client';
import React, { useEffect, useState } from 'react';
import { useUser, useFirestore, useAuth } from '@/firebase';
import { useRouter } from 'next/navigation';
import { doc, getDoc, getDocFromCache } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UserProfile {
  approved: boolean;
  displayName: string;
  email: string;
}

export default function RefereeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  const auth = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If the user hook is loading, we are also loading.
    if (isUserLoading) {
      setLoading(true);
      return;
    }

    // If there's no user after loading, send them to login.
    if (!user) {
      router.push('/login');
      return;
    }
    
    // If we have a user and firestore, fetch their data.
    if (user && firestore) {
      const userProfileRef = doc(firestore, 'users', user.uid);
      const adminDocRef = doc(firestore, 'admins', user.uid);

      // Use Promise.all to get both documents at once.
      // CRITICAL FIX: Use { source: 'server' } to bypass the cache and get fresh data.
      Promise.all([getDoc(userProfileRef, { source: 'server' }), getDoc(adminDocRef)])
        .then(([profileSnap, adminSnap]) => {
          if (profileSnap.exists()) {
            setProfile(profileSnap.data() as UserProfile);
          } else {
            // If the profile doesn't exist, it's an anomalous state, log them out.
            console.error('No user profile found for logged-in user.');
            handleLogout();
            return;
          }

          setIsAdmin(adminSnap.exists());
        })
        .catch((error) => {
          console.error('Error fetching user data:', error);
          // On error (e.g. offline), it might be safer to log out.
          handleLogout();
        })
        .finally(() => {
          // Finished loading only after getting the response from the DB.
          setLoading(false);
        });
    }
  }, [user, isUserLoading, firestore, router]);
  
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

  // If after loading there's no profile, log them out.
  if (!profile) {
     // handleLogout is already called in the error/non-existent case,
     // but as a fallback, we can show a loading/redirecting screen.
     return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <p className="text-lg">Redireccionando...</p>
        </div>
     );
  }

  // Access check: Allow entry if they are an Admin OR if their profile is approved.
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

  // If all validations pass, pass the 'isAdmin' prop to child components.
  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, { isAdmin } as any);
    }
    return child;
  });

  return <>{childrenWithProps}</>;
}
