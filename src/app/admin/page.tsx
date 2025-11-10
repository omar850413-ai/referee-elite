'use client';

import { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { UserProfile } from '@/lib/types';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function AdminPage() {
  const firestore = useFirestore();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchUsers = async () => {
      if (!firestore) return;
      try {
        const usersCollection = collection(firestore, 'users');
        const userSnapshot = await getDocs(usersCollection);
        const userList = userSnapshot.docs.map(doc => ({
          uid: doc.id,
          ...doc.data(),
        })) as UserProfile[];
        setUsers(userList);
      } catch (error) {
        console.error("Error fetching users:", error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No se pudieron cargar los usuarios. Es posible que no tengas permisos de administrador.',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [firestore, toast]);

  const handleApprovalChange = (uid: string, currentStatus: boolean) => {
    if (!firestore) return;

    const userDocRef = doc(firestore, 'users', uid);
    const newStatus = !currentStatus;
    
    updateDocumentNonBlocking(userDocRef, { approved: newStatus });

    setUsers(users.map(user => user.uid === uid ? { ...user, approved: newStatus } : user));
    toast({
      title: 'Éxito',
      description: `Usuario ${newStatus ? 'aprobado' : 'rechazado'} correctamente.`,
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
          {loading ? (
            <p>Cargando usuarios...</p>
          ) : (
            <div className="overflow-x-auto">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Aprobado</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {users.map((user) => (
                    <TableRow key={user.uid}>
                        <TableCell className="font-medium">{user.displayName}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell className="text-right">
                        <Switch
                            checked={user.approved}
                            onCheckedChange={() => handleApprovalChange(user.uid, user.approved)}
                            aria-label={`Approval switch for ${user.displayName}`}
                        />
                        </TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            </div>
          )}
        </CardContent>
      </Card>
      <div className="mt-6 p-4 border-l-4 border-yellow-500 bg-yellow-500/10 rounded-r-lg">
          <h3 className="font-bold text-yellow-800 dark:text-yellow-300">🚨 Instrucción Manual Requerida</h3>
          <p className="text-sm text-yellow-700 dark:text-yellow-200 mt-1">
              Para acceder a este panel, tu cuenta debe ser designada como administrador. Esto debe hacerse manualmente en la base de datos de Firebase por razones de seguridad.
          </p>
      </div>
    </div>
  );
}
