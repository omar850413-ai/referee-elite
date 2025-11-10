'use client';

import { useState, useEffect } from 'react';
import type { MatchAction, Team, TeamNames, ModalData } from '@/lib/types';
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

type GoalModalProps = {
  isOpen: boolean;
  dispatch: React.Dispatch<MatchAction>;
  modalData: ModalData;
  timerIsRunning: boolean;
  teamNames: TeamNames;
};

const GoalModal = ({ isOpen, dispatch, modalData, timerIsRunning, teamNames }: GoalModalProps) => {
  const [jersey, setJersey] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setJersey('');
    }
  }, [isOpen]);

  if (!modalData || modalData.type !== 'goal') return null;

  const { team, isSubtraction } = modalData.data as { team: Team; isSubtraction: boolean };
  const teamName = teamNames[team];
  const title = isSubtraction
    ? `⚠️ Quitar Gol de ${teamName}`
    : `⚽ Registrar Gol para ${teamName}`;

  const handleClose = () => {
    dispatch({ type: 'CLOSE_MODAL' });
  };

  const handleSubmit = () => {
    if (!isSubtraction && !timerIsRunning) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'El cronómetro debe estar corriendo para registrar un gol.',
      });
      return;
    }

    const jerseyNum = parseInt(jersey);
    if (!jerseyNum || jerseyNum < 1 || jerseyNum > 999) {
      toast({ variant: 'destructive', title: 'Error', description: 'Número de camiseta inválido.' });
      return;
    }

    if (isSubtraction) {
      dispatch({ type: 'REMOVE_GOAL', payload: { team, jersey: jerseyNum } });
    } else {
      dispatch({ type: 'ADD_GOAL', payload: { team, jersey: jerseyNum } });
    }
    handleClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle
            className={`text-2xl font-bold text-center ${
              isSubtraction ? 'text-remove-goal' : 'text-add-goal'
            }`}
          >
            {title}
          </DialogTitle>
        </DialogHeader>
        {!isSubtraction && !timerIsRunning && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>
              El cronómetro debe estar corriendo para registrar un gol.
            </AlertDescription>
          </Alert>
        )}
        <div className="py-4">
          <Label htmlFor="goal-player-number">Número de Camiseta del Anotador (1-999):</Label>
          <Input
            id="goal-player-number"
            type="number"
            min="1"
            max="999"
            value={jersey}
            onChange={(e) => setJersey(e.target.value)}
            className="mt-2"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            className={`text-white font-semibold ${
              isSubtraction
                ? 'bg-remove-goal hover:bg-remove-goal-dark'
                : 'bg-add-goal hover:bg-add-goal-dark'
            }`}
          >
            {isSubtraction ? 'Confirmar Quitar Gol' : 'Confirmar Gol'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GoalModal;
