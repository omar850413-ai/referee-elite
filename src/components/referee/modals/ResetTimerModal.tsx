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

type ResetTimerModalProps = {
  isOpen: boolean;
  dispatch: React.Dispatch<MatchAction>;
};

const ResetTimerModal = ({ isOpen, dispatch }: ResetTimerModalProps) => {
  const handleClose = () => {
    dispatch({ type: 'CLOSE_MODAL' });
  };

  const handleConfirm = () => {
    dispatch({ type: 'RESET_TIMER' });
    handleClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-destructive">
            ⚠️ Confirmar Reinicio de Cronómetro
          </AlertDialogTitle>
          <AlertDialogDescription>
            ¿Estás seguro de que quieres reiniciar el cronómetro a 00:00? El marcador y los eventos NO se borrarán.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
             <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
             <Button variant="destructive" onClick={handleConfirm}>SÍ, Reiniciar Cronómetro</Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ResetTimerModal;
