'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { useAuth, useFirestore, errorEmitter, FirestorePermissionError, useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function LoginPage() {
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
    // If the user is already logged in, redirect them to the home page.
    if (user && !isUserLoading) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const sessionId = `${Date.now()}-${Math.random()}`;
      localStorage.setItem('sessionId', sessionId);
      const userDocRef = doc(firestore, 'users', user.uid);

      // Check if user profile exists
      const userDoc = await getDoc(userDocRef).catch(err => {
        const permissionError = new FirestorePermissionError({
          path: userDocRef.path,
          operation: 'get',
        });
        errorEmitter.emit('permission-error', permissionError);
        throw err; // Re-throw to be caught by the outer try-catch
      });

      if (userDoc.exists()) {
        // Profile exists, just update the session ID
        const sessionData = { sessionId };
        await updateDoc(userDocRef, sessionData).catch(err => {
            const permissionError = new FirestorePermissionError({
                path: userDocRef.path,
                operation: 'update',
                requestResourceData: sessionData
            });
            errorEmitter.emit('permission-error', permissionError);
            throw err;
        });
      } else {
        // Profile does not exist: this is a re-activated user. 
        // Create a new profile with default non-approved, non-admin status.
        const isSuperAdmin = user.email === adminEmail;
        const profileData = {
          email: user.email,
          isAdmin: isSuperAdmin,
          isApproved: isSuperAdmin,
          sessionId: sessionId,
        };
        await setDoc(userDocRef, profileData).catch(err => {
            const permissionError = new FirestorePermissionError({
                path: userDocRef.path,
                operation: 'create',
                requestResourceData: profileData
            });
            errorEmitter.emit('permission-error', permissionError);
            throw err;
        });
      }

      router.push('/');
    } catch (err: any) {
      if (err.code === 'permission-denied') {
        // This is a Firestore security rule error. The detailed error is already
        // handled by the FirebaseErrorListener. We just show a generic message here.
        setError('Error de permisos al actualizar la sesión. Contacta al administrador.');
      } else if (err.code && err.code.startsWith('auth/')) {
        setError('Correo o contraseña incorrectos. Por favor, inténtalo de nuevo.');
      } else {
        console.error('Login Error:', err);
        setError('Ocurrió un error inesperado al iniciar sesión.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // While checking user auth state, show a loading screen.
  // Also, if the user is logged in, this will show until the redirect happens.
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

  // Only show login page if user is not logged in.
  return (
    <div className="flex items-center justify-center min-h-screen bg-sky-100">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-black uppercase italic text-primary">Iniciar Sesión</CardTitle>
          <CardDescription>Accede a tu panel de Asesor Pro.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSignIn}>
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
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700"
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                    {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                    ) : (
                        <Eye className="h-5 w-5" />
                    )}
                </button>
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Ingresando...' : 'Ingresar'}
            </Button>
            <p className="text-xs text-center text-gray-600">
              ¿No tienes cuenta?{' '}
              <Link href="/signup" className="text-primary hover:underline font-semibold">
                Regístrate aquí
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
