'use client';
import React, { useEffect, useState } from 'react';
import { useUser, useFirestore, useAuth } from '@/firebase';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
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
    // Si el hook de usuario está cargando, nosotros también.
    if (isUserLoading) {
      setLoading(true);
      return;
    }

    // Si no hay usuario después de cargar, lo mandamos al login.
    if (!user) {
      router.push('/login');
      return;
    }
    
    // Si tenemos usuario y firestore, buscamos sus datos.
    if (user && firestore) {
      const userProfileRef = doc(firestore, 'users', user.uid);
      const adminDocRef = doc(firestore, 'admins', user.uid);

      // Usamos Promise.all para obtener ambos documentos a la vez.
      Promise.all([getDoc(userProfileRef), getDoc(adminDocRef)])
        .then(([profileSnap, adminSnap]) => {
          if (profileSnap.exists()) {
            setProfile(profileSnap.data() as UserProfile);
          } else {
            // Si el perfil no existe, es un estado anómalo, lo deslogueamos.
            console.error('No user profile found for logged-in user.');
            handleLogout();
            return;
          }

          setIsAdmin(adminSnap.exists());
        })
        .catch((error) => {
          console.error('Error fetching user data:', error);
          setProfile(null);
          setIsAdmin(false);
        })
        .finally(() => {
          // Terminamos de cargar solo después de tener la respuesta de la DB.
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

  // Si después de cargar no hay perfil, lo sacamos.
  if (!profile) {
     handleLogout();
     return null;
  }

  // Comprobación de acceso: Permite entrar si es Admin O si su perfil está aprobado.
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

  // Si pasa todas las validaciones, le pasamos la prop 'isAdmin' a los componentes hijos.
  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, { isAdmin } as any);
    }
    return child;
  });

  return <>{childrenWithProps}</>;
}
