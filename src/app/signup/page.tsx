'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { useAuth, useFirestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // 1. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Use a transaction to create the user profile and set the first admin
      const userDocRef = doc(firestore, 'users', user.uid);
      const adminFlagRef = doc(firestore, 'globals', 'admin_setup');
      
      await runTransaction(firestore, async (transaction) => {
        const adminFlagDoc = await transaction.get(adminFlagRef);
        
        let isAdmin = false;
        let isApproved = false;

        // If no admin flag exists, this is the first user.
        if (!adminFlagDoc.exists()) {
          isAdmin = true;
          isApproved = true;
          // Set the admin flag so this can't happen again.
          transaction.set(adminFlagRef, { admin_user_uid: user.uid, setup_at: serverTimestamp() });
        }

        // Create the user profile inside the transaction.
        transaction.set(userDocRef, {
          email: user.email,
          isAdmin: isAdmin,
          isApproved: isApproved,
        });
      });


      // 3. Redirect to home (which will handle approval logic)
      router.push('/');
    } catch (err: any) {
       if (err.code === 'permission-denied') {
        setError('Error de permisos. Es posible que el primer administrador ya haya sido configurado.');
      } else {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-100">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-black uppercase italic text-primary">Crear Cuenta</CardTitle>
          <CardDescription>Regístrate para convertirte en asesor.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSignUp}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Registrando...' : 'Registrarme'}
            </Button>
            <p className="text-xs text-center text-gray-600">
              ¿Ya tienes cuenta?{' '}
              <Link href="/login" className="text-primary hover:underline font-semibold">
                Inicia sesión
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
