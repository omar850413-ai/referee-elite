'use client';

import { useUser, useFirestore } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
      return;
    }

    if (user && firestore) {
      const adminDocRef = doc(firestore, 'admins', user.uid);
      getDoc(adminDocRef)
        .then((docSnap) => {
          if (docSnap.exists()) {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
        })
        .catch(() => {
          setIsAdmin(false);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [user, isUserLoading, firestore, router]);

  if (isUserLoading || loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Verificando acceso...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background p-8 text-center">
        <h1 className="text-3xl font-bold text-destructive mb-4">Acceso Denegado</h1>
        <p className="max-w-md text-muted-foreground mb-8">
          No tienes permisos de administrador para acceder a esta sección.
        </p>
        <Button onClick={() => router.push('/referee')}>
          Volver a la aplicación
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
