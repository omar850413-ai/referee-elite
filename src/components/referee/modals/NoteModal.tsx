'use client';

import { useState } from 'react';
import type { MatchAction } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

type NoteModalProps = {
  isOpen: boolean;
  dispatch: React.Dispatch<MatchAction>;
  timerIsRunning: boolean;
};

const NoteModal = ({ isOpen, dispatch, timerIsRunning }: NoteModalProps) => {
  const [note, setNote] = useState('');
  const { toast } = useToast();

  const handleClose = () => {
    setNote('');
    dispatch({ type: 'CLOSE_MODAL' });
  };

  const handleSubmit = () => {
    if (!timerIsRunning) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'El cronómetro debe estar corriendo para registrar una anotación.',
      });
      return;
    }
    if (!note.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'La anotación no puede estar vacía.' });
      return;
    }

    dispatch({ type: 'ADD_NOTE', payload: { text: note.trim() } });
    handleClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-accent text-center">
            Anotar Incidente en Tiempo Real
          </DialogTitle>
        </DialogHeader>
        {!timerIsRunning && (
          <Alert variant="destructive">
            <AlertDescription>
              El cronómetro debe estar corriendo para registrar una anotación.
            </AlertDescription>
          </Alert>
        )}
        <div className="py-4 space-y-2">
          <Label htmlFor="note-text">Detalle de la Anotación:</Label>
          <Textarea
            id="note-text"
            rows={3}
            placeholder="Ej: Posible fuera de juego minuto 35..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
           <p className="text-xs text-muted-foreground pt-1">
                Si es otra causa, anótela usando la opción "Anotacion Asesor".
              </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} className="bg-accent hover:bg-orange-700">
            Registrar Anotación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NoteModal;
