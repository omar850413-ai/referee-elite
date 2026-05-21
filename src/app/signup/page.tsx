
'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useAuth, useFirestore, errorEmitter, FirestorePermissionError, useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();

  const adminEmail = 'omar850413@gmail.com';
  
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    if (user && !isUserLoading) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      const sessionId = `${Date.now()}-${Math.random()}`;
      localStorage.setItem('sessionId', sessionId);

      const userDocRef = doc(firestore, 'users', user.uid);
      const isSigningUpAsAdmin = user.email === adminEmail;

      const profileData = {
        email: user.email,
        isAdmin: isSigningUpAsAdmin,
        isApproved: isSigningUpAsAdmin,
        sessionId: sessionId,
        appId: 'referee-elite', // Marcamos al usuario para esta app
      };

      await setDoc(userDocRef, profileData).catch((err) => {
        const permissionError = new FirestorePermissionError({
          path: userDocRef.path,
          operation: 'create',
          requestResourceData: profileData,
        });
        errorEmitter.emit('permission-error', permissionError);
        throw err;
      });

      if (isSigningUpAsAdmin) {
        router.push('/');
      } else {
        router.push('/pending-approval');
      }
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError(
          'Este correo ya está registrado en este proyecto. Por favor, inicia sesión.'
        );
      } else if (err.code === 'permission-denied') {
        setError('Error de permisos. No se pudo crear el perfil de usuario.');
      } else {
        console.error('Sign up error:', err);
        setError('Ocurrió un error inesperado. Por favor, inténtalo de nuevo.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isUserLoading || user) {
     return (
      <div className="flex items-center justify-center min-h-screen bg-sky-100">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-4">
             <Skeleton className="h-8 w-48 mx-auto" />
             <Skeleton className="h-4 w-64 mx-auto" />
          </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                 <Skeleton className="h-4 w-24" />
                 <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                 <Skeleton className="h-4 w-24" />
                 <Skeleton className="h-10 w-full" />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Skeleton className="h-10 w-full" />
               <Skeleton className="h-4 w-48" />
            </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-sky-100">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-black uppercase italic text-primary">
            Crear Cuenta
          </CardTitle>
          <CardDescription>
            Regístrate para convertirte en asesor con Referee Elite.
          </CardDescription>
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
                onChange={(e) => setEmail(e.target.value.toLowerCase())}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="MÍNIMO 6 CARACTERES"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700"
                >
                    {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                    ) : (
                        <Eye className="h-5 w-5" />
                    )}
                </button>
              </div>
            </div>
            {error && <p className="text-sm text-red-600 font-bold">{error}</p>}
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full font-black italic" disabled={isLoading}>
              {isLoading ? 'REGISTRANDO...' : 'REGISTRARME'}
            </Button>
            <p className="text-xs text-center text-gray-600">
              ¿YA TIENES CUENTA?{' '}
              <Link
                href="/login"
                className="text-primary hover:underline font-semibold"
              >
                INICIA SESIÓN
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
