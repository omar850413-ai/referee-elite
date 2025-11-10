
'use client';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { doc, getDoc, Firestore } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Loader2 } from 'lucide-react';

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
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (user && firestore) {
      setLoadingProfile(true);
      const userProfileRef = doc(firestore, 'users', user.uid);
      getDoc(userProfileRef)
        .then((docSnap) => {
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          } else {
            // This case might happen if the user doc creation failed after registration
            console.error('No user profile found!');
            setProfile(null);
          }
        })
        .catch((error) => {
          console.error('Error fetching user profile:', error);
          setProfile(null);
        })
        .finally(() => {
          setLoadingProfile(false);
        });
    }
  }, [user, firestore]);

  if (isUserLoading || loadingProfile) {
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

  if (!profile.approved) {
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

  return <>{children}</>;
}
