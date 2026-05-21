'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signInWithEmailAndPassword, sendPasswordResetEmail, signOut } from 'firebase/auth';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { useAuth, useFirestore, errorEmitter, FirestorePermissionError, useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [resetEmail, setResetEmail] = useState('');
  const [isResetLoading, setIsResetLoading] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const adminEmail = 'omar850413@gmail.com';
  
  const { user, isUserLoading } = useUser();

  useEffect(() => {
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

      const userDocRef = doc(firestore, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const data = userDoc.data();
        const isSuperAdmin = user.email === adminEmail;
        
        if (data.appId && data.appId !== 'referee-elite' && !isSuperAdmin) {
          await signOut(auth);
          setError('ESTA CUENTA PERTENECE A OTRA APLICACIÓN. POR FAVOR, REGÍSTRATE CON UN CORREO DIFERENTE PARA REFEREE ELITE.');
          setIsLoading(false);
          return;
        }

        const sessionId = `${Date.now()}-${Math.random()}`;
        localStorage.setItem('sessionId', sessionId);
        
        await updateDoc(userDocRef, { sessionId }).catch(err => {
            const permissionError = new FirestorePermissionError({
                path: userDocRef.path,
                operation: 'update',
                requestResourceData: { sessionId }
            });
            errorEmitter.emit('permission-error', permissionError);
            throw err;
        });
      } else {
        await signOut(auth);
        setError('NO SE ENCONTRÓ UN PERFIL PARA ESTA CUENTA. POR FAVOR, REGÍSTRATE.');
        setIsLoading(false);
        return;
      }

      router.push('/');
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('CORREO O CONTRASEÑA INCORRECTOS.');
      } else {
        console.error('Login Error:', err);
        setError('OCURRIÓ UN ERROR AL INICIAR SESIÓN.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!resetEmail) return;

    setIsResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      toast({
        title: "CORREO ENVIADO",
        description: `SE HA ENVIADO UN ENLACE A ${resetEmail}.`,
      });
      setIsResetDialogOpen(false);
      setResetEmail('');
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "ERROR",
        description: "NO SE PUDO ENVIAR EL CORREO.",
      });
    } finally {
      setIsResetLoading(false);
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
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-sky-100">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-black uppercase italic text-primary">Iniciar Sesión</CardTitle>
          <CardDescription>ACCEDE A TU PANEL DE REFEREE ELITE.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSignIn}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">CORREO ELECTRÓNICO</Label>
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
              <div className="flex items-center justify-between">
                <Label htmlFor="password">CONTRASEÑA</Label>
                <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                  <DialogTrigger asChild>
                    <button type="button" className="text-xs text-primary hover:underline font-semibold">
                      ¿OLVIDASTE TU CONTRASEÑA?
                    </button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>RESTABLECER CONTRASEÑA</DialogTitle>
                      <DialogDescription>INGRESA TU CORREO PARA RECIBIR EL ENLACE.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                       <Input
                         type="email"
                         placeholder="tu@email.com"
                         value={resetEmail}
                         onChange={(e) => setResetEmail(e.target.value.toLowerCase())}
                       />
                    </div>
                    <DialogFooter>
                      <Button onClick={handleResetPassword} disabled={isResetLoading}>
                        {isResetLoading ? 'ENVIANDO...' : 'ENVIAR ENLACE'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
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
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500"
                >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            {error && <p className="text-sm text-red-600 font-bold text-center uppercase">{error}</p>}
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full font-black italic" disabled={isLoading}>
              {isLoading ? 'INGRESANDO...' : 'INGRESAR'}
            </Button>
            <p className="text-xs text-center text-gray-600">
              ¿NO TIENES CUENTA?{' '}
              <Link href="/signup" className="text-primary hover:underline font-semibold">
                REGÍSTRATE AQUÍ
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
