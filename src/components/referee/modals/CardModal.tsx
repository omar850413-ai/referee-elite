'use client';

import { useState, useEffect } from 'react';
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

const unsportingBehaviorReasons = [
  'Por realizar una entrada temeraria',
  'Por dar un golpe temerario',
  'Por realizar una zancadilla temeraria',
  'Por dar una patada temeraria',
  'Por provocar a un adversario',
  'Por quitarse la camiseta en la celebración de un gol',
  'Por realizar una carga temeraria',
  'Simulación',
];

const redCardReasons = [
  'Causal 1: Evitar un gol o una ocasión manifiesta de gol con mano voluntaria',
  'Causal 2: Evitar un gol o una ocasión manifiesta de gol con mano involuntaria (fuera del área)',
  'Causal 3: Evitar una ocasión manifiesta de gol con una infracción sancionable con tiro libre',
  'Causal 4: Juego brusco y grave',
  'Causal 5: Escupir o morder a alguien',
  'Causal 6: Conducta violenta',
  'Causal 7: Emplear lenguaje o actuar de modo ofensivo, insultante o humillante',
  'Causal 8: Recibir una segunda amonestación en el mismo partido',
  'Causal 9: Entrar en la sala de vídeo',
  'Causal (Técnico): Retrasar la reanudación del juego del adversario',
  'Causal (Técnico): Abandonar el área técnica para protestar o provocar',
  'Causal (Técnico): Entrar al área técnica adversaria con ánimo de confrontación',
  'Causal (Técnico): Lanzar un objeto al terreno de juego',
  'Causal (Técnico): Entrar al terreno de juego para enfrentarse a árbitros/jugadores',
  'Causal (Técnico): Comportarse de manera agresiva o con intimidación física',
];


const CardModal = ({ isOpen, dispatch, modalData, timerIsRunning, teamNames }: CardModalProps) => {
  const [jersey, setJersey] = useState('');
  const [reason, setReason] = useState('');
  const [subReason, setSubReason] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setJersey('');
      setReason('');
      setSubReason('');
    }
  }, [isOpen]);

  if (!modalData || modalData.type !== 'card') return null;

  const { cardType, team } = modalData.data as { cardType: CardType; team: Team };
  const teamName = teamNames[team];
  const title = cardType === 'yellow' ? `Amonestación (🟨) - ${teamName}` : `Expulsión (🟥) - ${teamName}`;
  const titleColor = cardType === 'yellow' ? 'text-yellow-500' : 'text-red-500';

  const showSubReason = reason === 'Causal 6 : Conducta antideportiva';

  const handleClose = () => {
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
    if (showSubReason && !subReason.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Debe seleccionar un criterio de conducta antideportiva.' });
      return;
    }

    const finalReason = showSubReason ? `${reason} - ${subReason}` : reason;

    dispatch({ type: 'ADD_CARD', payload: { team, cardType, jersey: jerseyNum, reason: finalReason.trim() } });
    handleClose();
  };
  
  const handleReasonChange = (value: string) => {
    setReason(value);
    setSubReason('');
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
            <Select onValueChange={handleReasonChange} value={reason}>
              <SelectTrigger id="card-reason">
                <SelectValue placeholder="Seleccione una causal" />
              </SelectTrigger>
              <SelectContent>
                {(cardType === 'yellow' ? yellowCardReasons : redCardReasons).map((r, index) => (
                  <SelectItem key={index} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {cardType === 'yellow' && showSubReason && (
            <div className="space-y-2 pl-4 border-l-2 border-primary ml-1 pt-2">
              <Label htmlFor="card-sub-reason">Criterio de Conducta Antideportiva:</Label>
              <Select onValueChange={setSubReason} value={subReason}>
                <SelectTrigger id="card-sub-reason">
                  <SelectValue placeholder="Seleccione un criterio" />
                </Trigger>
                <SelectContent>
                  {unsportingBehaviorReasons.map((subReason, index) => (
                    <SelectItem key={index} value={subReason}>
                      {subReason}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
               <p className="text-xs text-muted-foreground pt-1">
                Si es otra causa, anótela usando la opción "Anotación Juez".
              </p>
            </div>
          )}
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
