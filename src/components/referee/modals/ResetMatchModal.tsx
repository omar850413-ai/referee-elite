'use client';

import type { MatchAction } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

type ResetMatchModalProps = {
  isOpen: boolean;
  dispatch: React.Dispatch<MatchAction>;
};

const ResetMatchModal = ({ isOpen, dispatch }: ResetMatchModalProps) => {
  const handleClose = () => {
    dispatch({ type: 'CLOSE_MODAL' });
  };

  const handleConfirm = () => {
    dispatch({ type: 'RESET_MATCH' });
    handleClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-red-600">
            🚨 Confirmar Reinicio de Partido
          </AlertDialogTitle>
          <AlertDialogDescription>
            ESTO BORRARÁ TODO: Marcador, Faltas, Cronómetro, Historial de Eventos y Nombres de
            Equipo. Esta acción es irreversible.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button variant="destructive" onClick={handleConfirm}>SÍ, Borrar TODO</Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ResetMatchModal;
