'use client';

import { useState } from 'react';
import type { MatchAction, Team, CardType, TeamNames, ModalData } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

type CardModalProps = {
  isOpen: boolean;
  dispatch: React.Dispatch<MatchAction>;
  modalData: ModalData;
  timerIsRunning: boolean;
  teamNames: TeamNames;
};

const yellowCardReasons = [
  'Causal 1 : Retrasar la reanudación del juego',
  'Causal 2 : Mostrar desaprobación con palabras o acciones',
  'Causal 3 : Entrar o volver a entrar en el terreno de juego, o bien abandonarlo, de manera deliberada y sin permiso del Árbitro',
  'Causal 4 : No respetar la distancia reglamentaria en una reanudación.',
  'Causal 5 : Infringir reiteradamente las Reglas de Juego',
  'Causal 6 : Conducta antideportiva',
  'Causal 7 : Entrar al área de revisión del VAR',
  'Causal 8 : Repetir de manera insistente el gesto de la revisión del VAR.',
];

const CardModal = ({ isOpen, dispatch, modalData, timerIsRunning, teamNames }: CardModalProps) => {
  const [jersey, setJersey] = useState('');
  const [reason, setReason] = useState('');
  const { toast } = useToast();

  if (!modalData || modalData.type !== 'card') return null;

  const { cardType, team } = modalData.data as { cardType: CardType; team: Team };
  const teamName = teamNames[team];
  const title = cardType === 'yellow' ? `Amonestación (🟨) - ${teamName}` : `Expulsión (🟥) - ${teamName}`;
  const titleColor = cardType === 'yellow' ? 'text-yellow-500' : 'text-red-500';

  const handleClose = () => {
    setJersey('');
    setReason('');
    dispatch({ type: 'CLOSE_MODAL' });
  };

  const handleSubmit = () => {
    if (!timerIsRunning) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'El cronómetro debe estar corriendo para registrar una tarjeta.',
      });
      return;
    }
    const jerseyNum = parseInt(jersey);
    if (!jerseyNum || jerseyNum < 1 || jerseyNum > 999) {
      toast({ variant: 'destructive', title: 'Error', description: 'Número de camiseta inválido.' });
      return;
    }
    if (!reason.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'La causa es obligatoria.' });
      return;
    }

    dispatch({ type: 'ADD_CARD', payload: { team, cardType, jersey: jerseyNum, reason: reason.trim() } });
    handleClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className={`text-2xl font-bold text-center ${titleColor}`}>{title}</DialogTitle>
        </DialogHeader>
        {!timerIsRunning && (
          <Alert variant="destructive">
            <AlertDescription>
              El cronómetro debe estar corriendo para registrar una tarjeta.
            </AlertDescription>
          </Alert>
        )}
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="card-player-number">Número de Camiseta (1-999):</Label>
            <Input
              id="card-player-number"
              type="number"
              min="1"
              max="999"
              value={jersey}
              onChange={(e) => setJersey(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="card-reason">Causa de la Tarjeta:</Label>
            {cardType === 'yellow' ? (
              <Select onValueChange={setReason} value={reason}>
                <SelectTrigger id="card-reason">
                  <SelectValue placeholder="Seleccione una causal" />
                </SelectTrigger>
                <SelectContent>
                  {yellowCardReasons.map((reason, index) => (
                    <SelectItem key={index} value={reason}>
                      {reason}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="card-reason"
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} className="bg-accent hover:bg-orange-700">
            Registrar Tarjeta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CardModal;
