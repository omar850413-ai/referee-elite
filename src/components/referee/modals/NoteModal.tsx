
'use client';

import { useState, useEffect } from 'react';
import type { MatchAction, PendingEvent, GameEvent, NoteEvent } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { formatTime } from '@/lib/utils';

type NoteModalProps = {
  isOpen: boolean;
  dispatch: React.Dispatch<MatchAction>;
  pendingEvent: PendingEvent | null;
  editingEvent: GameEvent | null;
};

const NoteModal = ({ isOpen, dispatch, pendingEvent, editingEvent }: NoteModalProps) => {
  const [note, setNote] = useState('');
  const { toast } = useToast();
  const isEditing = !!editingEvent;

  useEffect(() => {
    if (isOpen) {
      if (isEditing && editingEvent?.type === 'note') {
        setNote((editingEvent as NoteEvent).text);
      } else {
        setNote('');
      }
    }
  }, [isOpen, isEditing, editingEvent]);

  const handleClose = () => {
    dispatch({ type: 'CLOSE_MODAL' });
  };
  
  const eventTime = isEditing ? editingEvent.time : pendingEvent?.time;
  const title = isEditing ? 'Editar Anotación' : 'Anotar Incidente en Tiempo Real';

  const handleSubmit = () => {
    if (!note.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'La anotación no puede estar vacía.' });
      return;
    }
    
    if (isEditing) {
      dispatch({
        type: 'UPDATE_EVENT',
        payload: {
          updatedEvent: {
            ...editingEvent,
            text: note.trim(),
          } as NoteEvent
        }
      });
    } else {
      if (!pendingEvent) {
        toast({ variant: 'destructive', title: 'Error', description: 'El cronómetro debe estar corriendo.' });
        return;
      }
      dispatch({ type: 'ADD_NOTE', payload: { text: note.trim(), time: pendingEvent.time } });
    }
    
    handleClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-accent text-center">
            {title}
          </DialogTitle>
          {eventTime !== undefined && (
            <DialogDescription className="text-center text-lg font-mono">
              Tiempo del evento: {formatTime(eventTime)}
            </DialogDescription>
          )}
        </DialogHeader>
        {!pendingEvent && !isEditing && (
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
            {isEditing ? 'Guardar Cambios' : 'Registrar Anotación'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NoteModal;
