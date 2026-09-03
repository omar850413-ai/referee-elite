
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
  const [fullName, setFullName] = useState('');
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

    const trimmedFullName = fullName.toUpperCase().trim();
    if (!trimmedFullName || trimmedFullName.length < 5) {
      setError('Por favor ingresa tu nombre completo oficial (mínimo 5 caracteres).');
      return;
    }

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
        fullName: trimmedFullName,
        isAdmin: isSigningUpAsAdmin,
        isApproved: isSigningUpAsAdmin,
        sessionId: sessionId,
        appId: 'referee-elite',
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
    <div className="flex items-center justify-center min-h-screen bg-slate-900 p-4">
      <Card className="w-full max-w-md border-none shadow-2xl rounded-3xl overflow-hidden">
        <CardHeader className="text-center bg-blue-900 text-white p-6">
          <CardTitle className="text-3xl font-black uppercase italic tracking-tighter">
            Referee <span className="text-emerald-400">Elite</span>
          </CardTitle>
          <CardDescription className="text-blue-100 text-xs font-bold uppercase mt-1">
            Registro Oficial de Árbitros y Asesores
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSignUp}>
          <CardContent className="space-y-4 p-6 bg-white">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="font-bold text-slate-800 text-xs uppercase">
                Nombre Completo Oficial *
              </Label>
              <Input
                id="fullName"
                type="text"
                placeholder="EJ. OMAR ALEJANDRO LÓPEZ PÉREZ"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="uppercase font-bold"
                required
              />
              <p className="text-[10px] text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200 font-medium leading-tight">
                🔒 <strong>Atención:</strong> Ingresa tu nombre real completo. Este nombre aparecerá automáticamente y de forma inalterable en todas tus cédulas arbitrales en PDF e Imagen.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="font-bold text-slate-800 text-xs uppercase">
                Correo Electrónico *
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="TU@EMAIL.COM"
                value={email}
                onChange={(e) => setEmail(e.target.value.toLowerCase())}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="font-bold text-slate-800 text-xs uppercase">
                Contraseña *
              </Label>
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
            {error && <p className="text-sm text-red-600 font-bold bg-red-50 p-3 rounded-xl border border-red-200">{error}</p>}
          </CardContent>
          <CardFooter className="flex flex-col gap-4 p-6 bg-slate-50 border-t">
            <Button type="submit" className="w-full font-black italic bg-blue-900 hover:bg-black text-white h-12 rounded-xl text-base shadow-lg" disabled={isLoading}>
              {isLoading ? 'REGISTRANDO...' : 'CREAR MI CUENTA'}
            </Button>
            <p className="text-xs text-center text-gray-600">
              ¿YA TIENES CUENTA?{' '}
              <Link
                href="/login"
                className="text-blue-700 hover:underline font-bold"
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
