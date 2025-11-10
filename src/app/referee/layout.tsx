
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Shield, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function RefereeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, approved, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Loader className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  if (!approved) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-center p-4">
        <Shield className="h-16 w-16 text-yellow-500" />
        <h1 className="mt-4 text-2xl font-bold text-foreground">Acceso Pendiente</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Tu cuenta está pendiente de aprobación por un administrador.
        </p>
         <Button onClick={() => router.push('/login')} className="mt-6">
          Volver a Inicio de Sesión
        </Button>
      </div>
    );
  }
  
  if (user) {
     return <>{children}</>;
  }

  return null;
}
