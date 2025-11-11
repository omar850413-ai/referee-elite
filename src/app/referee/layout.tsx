
'use client';
import React, { useEffect, useState } from 'react';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
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
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (user && firestore) {
      setLoading(true);
      const userProfileRef = doc(firestore, 'users', user.uid);
      const adminDocRef = doc(firestore, 'admins', user.uid);

      Promise.all([getDoc(userProfileRef), getDoc(adminDocRef)])
        .then(([profileSnap, adminSnap]) => {
          if (profileSnap.exists()) {
            setProfile(profileSnap.data() as UserProfile);
          } else {
            console.error('No user profile found!');
            setProfile(null);
          }
          if (adminSnap.exists()) {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
        })
        .catch((error) => {
          console.error('Error fetching user data:', error);
          setProfile(null);
          setIsAdmin(false);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [user, firestore]);

  if (isUserLoading || loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Cargando...</p>
      </div>
    );
  }

  if (!profile) {
     router.push('/login');
     return null;
  }

  // Allow access if the user is an admin OR their profile is approved.
  if (!isAdmin && !profile.approved) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background p-8 text-center">
        <h1 className="text-3xl font-bold text-primary-dark mb-4">
          Pendiente de Aprobación
        </h1>
        <p className="max-w-md text-muted-foreground mb-8">
          Tu cuenta ha sido registrada, pero necesitas que un administrador la apruebe para poder acceder a la aplicación. Por favor, contacta al administrador.
        </p>
        <Button onClick={() => router.push('/login')}>
          Volver a Inicio de Sesión
        </Button>
      </div>
    );
  }

  // Pass isAdmin to children
  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, { isAdmin } as any);
    }
    return child;
  });

  return <>{childrenWithProps}</>;
}
