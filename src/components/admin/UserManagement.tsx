
'use client';

import { useState, useEffect } from 'react';
import { db } from '@/firebase/client';
import { collection, getDocs, updateDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface UserData {
  id: string;
  email: string;
  approved: boolean;
  createdAt: {
    seconds: number;
    nanoseconds: number;
  } | null;
}

export default function UserManagement() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(usersQuery, (querySnapshot) => {
      const usersData: UserData[] = [];
      querySnapshot.forEach((doc) => {
        usersData.push({ id: doc.id, ...doc.data() } as UserData);
      });
      setUsers(usersData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching users: ", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudieron cargar los usuarios.',
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  const handleApprovalChange = async (userId: string, currentStatus: boolean) => {
    const userDocRef = doc(db, 'users', userId);
    try {
      await updateDoc(userDocRef, {
        approved: !currentStatus,
      });
      toast({
        title: 'Éxito',
        description: `El estado del usuario ha sido actualizado.`,
      });
    } catch (error) {
      console.error('Error updating user status: ', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo actualizar el estado del usuario.',
      });
    }
  };

  const formatDate = (timestamp: UserData['createdAt']) => {
    if (!timestamp) return 'Fecha no disponible';
    const date = new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
    return format(date, "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es });
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestionar Usuarios</CardTitle>
        <CardDescription>
          Aquí puedes ver todos los usuarios registrados y aprobar o denegar su acceso a la aplicación.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email del Usuario</TableHead>
                <TableHead>Fecha de Registro</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Aprobar Acceso</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-6 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-6 w-12 inline-block" /></TableCell>
                  </TableRow>
                ))
              ) : users.length > 0 ? (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>{formatDate(user.createdAt)}</TableCell>
                    <TableCell>
                      <Badge variant={user.approved ? 'default' : 'destructive'}>
                        {user.approved ? 'Aprobado' : 'Pendiente'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Switch
                        checked={user.approved}
                        onCheckedChange={() => handleApprovalChange(user.id, user.approved)}
                        aria-label={`Aprobar a ${user.email}`}
                      />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24">
                    No hay usuarios registrados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
