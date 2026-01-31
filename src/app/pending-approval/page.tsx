'use client';
import { useAuth } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';

export default function PendingApprovalPage() {
  const auth = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-100">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle>Cuenta Pendiente de Aprobación</CardTitle>
          <CardDescription className="pt-2">
            Tu cuenta ha sido registrada correctamente. Un administrador revisará tu solicitud y la aprobará pronto.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Por favor, espera a recibir la confirmación. Si tienes alguna duda, contacta al administrador.
          </p>
          <Button onClick={handleLogout} variant="outline">
            Cerrar Sesión
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
