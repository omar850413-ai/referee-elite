'use client';
import React, { useEffect, useState } from 'react';
import { useUser, useFirestore, useAuth } from '@/firebase';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdminProvider, useAdmin } from '@/context/AdminContext';
import { UserProfile } from '@/lib/types';

function RefereeLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  const auth = useAuth();
  const { setIsAdmin } = useAdmin();

  const [status, setStatus] = useState<'loading' | 'pending' | 'approved'>('loading');

  useEffect(() => {
    // Si la autenticación aún está cargando, o si no hay usuario y ya terminó de cargar, esperamos.
    if (isAuthLoading) {
      setStatus('loading');
      return;
    }

    // Si terminó de cargar y no hay usuario, lo mandamos al login.
    if (!user) {
      router.push('/login');
      return;
    }

    // Si llegamos aquí, tenemos un usuario. Ahora verificamos su estado.
    const checkUserStatus = async () => {
      if (!firestore || !user) return;

      // 1. Primero, verificamos si es administrador. Esta es la comprobación más prioritaria.
      const adminDocRef = doc(firestore, 'admins', user.uid);
      try {
        const adminDocSnap = await getDoc(adminDocRef);
        if (adminDocSnap.exists()) {
          setIsAdmin(true);
          setStatus('approved');
          return; // Es admin, tiene acceso. Terminamos la función.
        }
      } catch (error) {
        // Un error de permisos aquí es normal para usuarios no-admin. Lo ignoramos.
        console.log('User is not an admin.');
      }
      
      // 2. Si no es admin, procedemos a verificar su perfil de usuario normal.
      const userProfileRef = doc(firestore, 'users', user.uid);
      try {
        const userProfileSnap = await getDoc(userProfileRef);
        if (userProfileSnap.exists()) {
          const userProfile = userProfileSnap.data() as UserProfile;
          if (userProfile.approved) {
            setStatus('approved'); // Está aprobado. Tiene acceso.
          } else {
            setStatus('pending'); // Existe pero no está aprobado.
          }
        } else {
          // El perfil de usuario aún no se ha creado o hay un problema.
          setStatus('pending'); 
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
        setStatus('pending'); // En caso de error, lo dejamos como pendiente por seguridad.
      }
    };

    checkUserStatus();

  }, [user, isAuthLoading, firestore, router, setIsAdmin]);

  const handleLogout = () => {
    if (auth) {
      signOut(auth).then(() => {
        router.push('/login');
      });
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Verificando acceso...</p>
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background p-8 text-center">
        <h1 className="text-3xl font-bold text-primary-dark mb-4">
          Pendiente de Aprobación
        </h1>
        <p className="max-w-md text-muted-foreground mb-8">
          Tu cuenta ha sido registrada, pero un administrador necesita aprobarla. Por favor, contacta al administrador y vuelve a iniciar sesión después de ser aprobado.
        </p>
        <Button onClick={handleLogout}>
          Volver a Inicio de Sesión
        </Button>
      </div>
    );
  }

  // Si el estado es 'approved', muestra la aplicación.
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
