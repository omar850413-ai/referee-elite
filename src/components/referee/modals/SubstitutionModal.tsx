
'use client';

import { useState, useEffect } from 'react';
import type { MatchAction, Team, TeamNames, ModalData, Period, PendingEvent, GameEvent, SubstitutionEvent } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { formatTime } from '@/lib/utils';

type SubstitutionModalProps = {
  isOpen: boolean;
  dispatch: React.Dispatch<MatchAction>;
  modalData: ModalData | null;
  pendingEvent: PendingEvent | null;
  editingEvent: GameEvent | null;
  period: Period;
  teamNames: TeamNames;
};

const SubstitutionModal = ({ isOpen, dispatch, modalData, pendingEvent, editingEvent, period, teamNames }: SubstitutionModalProps) => {
  const [playerIn, setPlayerIn] = useState('');
  const [playerOut, setPlayerOut] = useState('');
  const { toast } = useToast();
  const isEditing = !!editingEvent;

  useEffect(() => {
    if (isOpen) {
      if (isEditing && editingEvent?.type === 'substitution') {
        const eventToEdit = editingEvent as SubstitutionEvent;
        setPlayerIn(eventToEdit.playerIn.toString());
        setPlayerOut(eventToEdit.playerOut.toString());
      } else {
        setPlayerIn('');
        setPlayerOut('');
      }
    }
  }, [isOpen, isEditing, editingEvent]);

  if (!modalData || modalData.type !== 'substitution') return null;

  const { team } = modalData.data as { team: Team };
  const teamName = teamNames[team];
  const title = isEditing ? 'Editar Sustitución' : `Sustitución - ${teamName}`;
  const eventTime = isEditing ? editingEvent.time : pendingEvent?.time;
  const canSubstitute = !!pendingEvent || isEditing;

  const handleClose = () => {
    dispatch({ type: 'CLOSE_MODAL' });
  };

  const handleSubmit = () => {
    const playerInNum = parseInt(playerIn);
    const playerOutNum = parseInt(playerOut);

    if (!playerInNum || playerInNum < 1 || playerInNum > 999 || !playerOutNum || playerOutNum < 1 || playerOutNum > 999) {
      toast({ variant: 'destructive', title: 'Error', description: 'Número de camiseta inválido (debe ser entre 1 y 999).' });
      return;
    }
    
    if (playerInNum === playerOutNum) {
      toast({ variant: 'destructive', title: 'Error', description: 'El jugador que entra y sale no puede ser el mismo.' });
      return;
    }

    if (isEditing) {
       dispatch({
        type: 'UPDATE_EVENT',
        payload: {
          updatedEvent: {
            ...editingEvent,
            playerIn: playerInNum,
            playerOut: playerOutNum,
            team,
          } as SubstitutionEvent,
        },
      });
    } else {
      if (!pendingEvent) {
        toast({ variant: 'destructive', title: 'Error', description: 'No hay un evento pendiente.' });
        return;
      }
       dispatch({
        type: 'ADD_SUBSTITUTION',
        payload: { team, playerIn: playerInNum, playerOut: playerOutNum, time: pendingEvent.time },
      });
    }

    handleClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center text-blue-600">{title}</DialogTitle>
          {eventTime !== undefined && (
            <DialogDescription className="text-center text-lg font-mono">
              Tiempo del evento: {formatTime(eventTime)}
            </DialogDescription>
          )}
        </DialogHeader>
        {!canSubstitute && (
          <Alert variant="destructive">
            <AlertDescription>
              Las sustituciones solo se pueden registrar durante el juego o en el entretiempo.
            </AlertDescription>
          </Alert>
        )}
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="player-in-number">Entra Camiseta # (1-999):</Label>
            <Input
              id="player-in-number"
              type="number"
              min="1"
              max="999"
              value={playerIn}
              onChange={(e) => setPlayerIn(e.target.value)}
              className="border-green-500"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="player-out-number">Sale Camiseta # (1-999):</Label>
            <Input
              id="player-out-number"
              type="number"
              min="1"
              max="999"
              value={playerOut}
              onChange={(e) => setPlayerOut(e.target.value)}
              className="border-red-500"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700">
            {isEditing ? 'Guardar Cambios' : 'Confirmar Sustitución'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SubstitutionModal;
