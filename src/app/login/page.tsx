
'use client';

import { useState } from 'react';
import { useAuth, useFirestore, useMemoFirebase } from '@/firebase';
import { signInWithEmailAndPassword, getAuth, onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';


export default function LoginPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    if (!firestore) {
        setError('Servicio de base de datos no disponible. Intente más tarde.');
        setLoading(false);
        return;
    }

    try {
      // Step 1: Temporarily sign in to get the UID
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Step 2: Check for an active session in Firestore
      const userDocRef = doc(firestore, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data() as UserProfile;
        const sessionTimeout = 15 * 1000; // 15 seconds
        const now = Date.now();

        if (userData.activeSessionId && userData.sessionLastActive && (now - userData.sessionLastActive < sessionTimeout)) {
          // Active session found, sign the temporary user out and show error
          await auth.signOut();
          setError('Esta cuenta está actualmente en uso en otro dispositivo.');
          toast({ variant: 'destructive', title: 'Error de Sesión', description: 'Esta cuenta ya tiene una sesión activa.' });
          setLoading(false);
          return;
        }
      }
      
      // Step 3: If no active session, proceed with the login logic.
      // The onAuthStateChanged listener in the layout will handle the rest.
      toast({ title: 'Éxito', description: 'Has iniciado sesión correctamente.' });
      router.replace('/referee'); // <--- AQUI ESTÁ EL CAMBIO

    } catch (error: any) {
      console.error(error);
      const errorCode = error.code;
      let errorMessage = 'Ocurrió un error al iniciar sesión.';
      if (errorCode === 'auth/user-not-found' || errorCode === 'auth/wrong-password' || errorCode === 'auth/invalid-credential') {
        errorMessage = 'El correo o la contraseña son incorrectos.';
      }
      setError(errorMessage);
      toast({ variant: 'destructive', title: 'Error', description: errorMessage });
    } finally {
      // Do not set loading to false here immediately, let navigation happen
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Iniciar Sesión</CardTitle>
          <CardDescription>Accede a tu cuenta de Asesor FMF</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
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
                  disabled={loading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verificando... </> : 'Iniciar Sesión'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            ¿No tienes una cuenta?{' '}
            <Link href="/signup" className="underline">
              Regístrate
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
