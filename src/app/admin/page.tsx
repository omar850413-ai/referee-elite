'use client';

import { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { UserProfile } from '@/lib/types';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';

export default function AdminPage() {
  const firestore = useFirestore();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchUsers = async () => {
      if (!firestore) {
        return;
      }
      try {
        setLoading(true);
        const usersCollection = collection(firestore, 'users');
        const userSnapshot = await getDocs(usersCollection);
        const userList = userSnapshot.docs.map(doc => ({
          uid: doc.id,
          ...doc.data(),
        })) as UserProfile[];
        setUsers(userList);
        setError(null);
      } catch (error: any) {
        console.error("Error fetching users:", error);
        const errorMessage = 'No se pudieron cargar los usuarios. Es posible que todavía no tengas los permisos de administrador correctos.';
        setError(errorMessage);
        toast({
          variant: 'destructive',
          title: 'Error de Permisos',
          description: errorMessage,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [firestore, toast]);

  const handleApproval = (uid: string, shouldApprove: boolean) => {
    if (!firestore) return;

    const userDocRef = doc(firestore, 'users', uid);
    
    // Use a non-blocking update for UI responsiveness
    updateDocumentNonBlocking(userDocRef, { approved: shouldApprove });

    // Optimistically update the UI
    setUsers(users.map(user => user.uid === uid ? { ...user, approved: shouldApprove } : user));
    
    toast({
      title: 'Éxito',
      description: `El usuario ha sido ${shouldApprove ? 'aprobado' : 'rechazado'}.`,
    });
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
       <header className="flex justify-between items-center border-b-4 border-primary-dark pb-2 drop-shadow-lg mb-6">
        <h1 className="text-2xl sm:text-4xl font-black tracking-tighter text-primary-dark [text-shadow:1px_1px_0px_hsl(var(--muted-foreground)),2px_2px_0px_hsl(var(--secondary))]">
          ⚽ Panel de Administrador ⚽
        </h1>
        <Button asChild variant="outline">
            <Link href="/referee">Ir a la App</Link>
        </Button>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Usuarios Registrados</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <p>Cargando usuarios...</p>}
          {!loading && error && (
             <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error al Cargar Usuarios</AlertTitle>
                <AlertDescription>
                    {error} Asegúrate de haber seguido las instrucciones de abajo correctamente.
                </AlertDescription>
            </Alert>
          )}
          {!loading && !error && users.length === 0 && (
            <p className="text-muted-foreground italic">No hay usuarios registrados todavía.</p>
          )}
          {!loading && !error && users.length > 0 && (
            <div className="overflow-x-auto">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {users.map((user) => (
                    <TableRow key={user.uid}>
                        <TableCell className="font-medium">{user.displayName}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          {user.approved ? (
                            <span className="flex items-center gap-2 text-green-600 font-semibold"><CheckCircle className="h-4 w-4" /> Aprobado</span>
                          ) : (
                            <span className="flex items-center gap-2 text-yellow-600 font-semibold"><AlertCircle className="h-4 w-4" /> Pendiente</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {!user.approved ? (
                               <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleApproval(user.uid, true)}>
                                 <CheckCircle className="mr-2 h-4 w-4" /> Aceptar
                               </Button>
                            ) : null}
                            {user.approved ? (
                              <Button size="sm" variant="destructive" onClick={() => handleApproval(user.uid, false)}>
                                <XCircle className="mr-2 h-4 w-4" /> Rechazar
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            </div>
          )}
        </CardContent>
      </Card>
      <div className="mt-8 p-6 border-l-4 border-yellow-500 bg-yellow-500/10 rounded-r-lg">
          <h3 className="text-xl font-bold text-yellow-800 dark:text-yellow-300 mb-3">🚨 Cómo convertirte en Administrador (Acción Manual Requerida)</h3>
          <p className="text-sm text-yellow-700 dark:text-yellow-200 mb-4">
              Para poder usar este panel, tu cuenta necesita privilegios de administrador. Este es un paso de seguridad que debes hacer manually una sola vez.
          </p>
          <ol className="list-decimal list-inside space-y-3 text-sm text-yellow-800 dark:text-yellow-200">
              <li>
                  <strong>Regístrate en la App:</strong> Si aún no lo has hecho, crea una cuenta para ti en la página de registro.
              </li>
              <li>
                  <strong>Obtén tu ID de Usuario (UID):</strong>
                  <ul className="list-disc list-inside pl-5 mt-1 space-y-1">
                      <li>Ve a la <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="font-bold underline hover:text-yellow-900 dark:hover:text-yellow-100">Consola de Firebase</a> y selecciona tu proyecto.</li>
                      <li>En el menú de la izquierda, ve a <strong>Compilación &gt; Authentication</strong>.</li>
                      <li>En la pestaña <strong>Users</strong>, busca tu correo y copia el valor de la columna <strong>User UID</strong>. Se ve algo como <code className="bg-yellow-200 dark:bg-yellow-800/50 px-1 py-0.5 rounded">aBcDeFgHiJkLmNoPqRsTuVwXyZ12</code>.</li>
                  </ul>
              </li>
              <li>
                  <strong>Crea el documento de administrador:</strong>
                   <ul className="list-disc list-inside pl-5 mt-1 space-y-1">
                      <li>En el menú de la izquierda, ve a <strong>Compilación &gt; Firestore Database</strong>.</li>
                      <li>Haz clic en <strong>+ Iniciar colección</strong>.</li>
                      <li>En <strong>ID de la colección</strong>, escribe <code className="bg-yellow-200 dark:bg-yellow-800/50 px-1 py-0.5 rounded">admins</code>.</li>
                      <li>Haz clic en <strong>Siguiente</strong>.</li>
                      <li>Para el <strong>ID del documento</strong>, **PEGA** el User UID que copiaste antes.</li>
                      <li>En <strong>Campo</strong>, escribe <code className="bg-yellow-200 dark:bg-yellow-800/50 px-1 py-0.5 rounded">isAdmin</code>, selecciona el tipo <code className="bg-yellow-200 dark:bg-yellow-800/50 px-1 py-0.5 rounded">boolean</code>, y elige el valor <code className="bg-yellow-200 dark:bg-yellow-800/50 px-1 py-0.5 rounded">true</code>.</li>
                      <li>Haz clic en <strong>Guardar</strong>.</li>
                  </ul>
              </li>
          </ol>
           <p className="text-sm text-yellow-700 dark:text-yellow-200 mt-4 font-semibold">
              Una vez hecho esto, recarga esta página y tendrás acceso completo para administrar a los usuarios.
          </p>
      </div>
    </div>
  );
}
