
'use client';

import { useState, useEffect } from 'react';
import type { MatchAction, Team, TeamNames, ModalData, GoalType, PendingEvent, GameEvent, GoalEvent } from '@/lib/types';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatTime } from '@/lib/utils';

type GoalModalProps = {
  isOpen: boolean;
  dispatch: React.Dispatch<MatchAction>;
  modalData: ModalData | null;
  pendingEvent: PendingEvent | null;
  editingEvent: GameEvent | null;
  teamNames: TeamNames;
};

const GoalModal = ({ isOpen, dispatch, modalData, pendingEvent, editingEvent, teamNames }: GoalModalProps) => {
  const [jersey, setJersey] = useState('');
  const [goalType, setGoalType] = useState<GoalType>('regular');
  const [ownGoalTeam, setOwnGoalTeam] = useState<Team | ''>('');
  const { toast } = useToast();
  const isEditing = !!editingEvent;

  useEffect(() => {
    if (isOpen) {
      if (isEditing && editingEvent?.type === 'goal') {
        const eventToEdit = editingEvent as GoalEvent;
        setJersey(eventToEdit.jersey.toString());
        setGoalType(eventToEdit.goalType);
        
        if (eventToEdit.goalType === 'own_goal') {
          // If it's an own goal, the 'team' property is the one that gets the point.
          // The team that COMMITTED the own goal is the other one.
          setOwnGoalTeam(eventToEdit.team === 'home' ? 'away' : 'home');
        } else {
          setOwnGoalTeam('');
        }
      } else {
        // Reset for "add new" mode or other modes
        setJersey('');
        setGoalType('regular');
        setOwnGoalTeam('');
      }
    }
  }, [isOpen, isEditing, editingEvent]);

  if (!modalData || modalData.type !== 'goal') return null;

  const { team, isSubtraction } = modalData.data as { team: Team; isSubtraction?: boolean };
  const teamName = teamNames[team];
  const title = isEditing ? 'Editar Gol' : (isSubtraction ? `⚠️ Anular Gol de ${teamName}` : `⚽ Registrar Gol para ${teamName}`);
  const otherTeam: Team = team === 'home' ? 'away' : 'home';
  const eventTime = isEditing ? editingEvent.time : pendingEvent?.time;

  const handleClose = () => {
    dispatch({ type: 'CLOSE_MODAL' });
  };
  
  const handleSubmit = () => {
    const jerseyNum = parseInt(jersey);
    if (!jerseyNum || jerseyNum < 1 || jerseyNum > 999) {
      toast({ variant: 'destructive', title: 'Error', description: 'Número de camiseta inválido.' });
      return;
    }

    if (isEditing) {
      const originalEvent = editingEvent as GoalEvent;
      let teamThatScored = originalEvent.team; // By default, assume the team is the same
      if (goalType === 'own_goal') {
        if (!ownGoalTeam) {
            toast({ variant: 'destructive', title: 'Error', description: 'Debe seleccionar el equipo que cometió el autogol.' });
            return;
        }
        // The team that scores is the one that is NOT the own goal team
        teamThatScored = ownGoalTeam === 'home' ? 'away' : 'home';
      } else {
        // For regular or penalty goals, the team is the one from the original event context.
        teamThatScored = team;
      }

      dispatch({
        type: 'UPDATE_EVENT',
        payload: {
          updatedEvent: {
            ...originalEvent,
            jersey: jerseyNum,
            goalType,
            team: teamThatScored,
          } as GoalEvent,
        },
      });
    } else {
      // Logic for ADDING a new goal
      if (!pendingEvent) {
        toast({ variant: 'destructive', title: 'Error', description: 'No hay un evento de gol pendiente.' });
        return;
      }
      let teamThatScored = team;
      if (goalType === 'own_goal') {
        if (!ownGoalTeam) {
          toast({ variant: 'destructive', title: 'Error', description: 'Debe seleccionar el equipo que cometió el autogol.' });
          return;
        }
        teamThatScored = ownGoalTeam === 'home' ? 'away' : 'home';
      }
      dispatch({
        type: 'ADD_GOAL',
        payload: { team: teamThatScored, jersey: jerseyNum, goalType, time: pendingEvent.time },
      });
    }
    handleClose();
  };
  
  const handleRemoveGoal = () => {
    if (!pendingEvent) {
      toast({ variant: 'destructive', title: 'Error', description: 'No hay un evento pendiente.' });
      return;
    }
    const jerseyNum = parseInt(jersey);
    if (!jerseyNum || jerseyNum < 1 || jerseyNum > 999) {
        toast({ variant: 'destructive', title: 'Error', description: 'Número de camiseta inválido.' });
        return;
    }
    dispatch({ type: 'REMOVE_GOAL', payload: { team, jersey: jerseyNum, time: pendingEvent.time } });
    handleClose();
  }

  const renderAddOrEditGoalForm = () => (
    <>
      {!pendingEvent && !isEditing && (
        <Alert variant="destructive">
          <AlertDescription>El cronómetro debe estar corriendo para registrar un gol.</AlertDescription>
        </Alert>
      )}
      <div className="space-y-2">
        <Label>Tipo de Gol</Label>
        <RadioGroup value={goalType} onValueChange={(v) => setGoalType(v as GoalType)} className="flex space-x-4">
          <div className="flex items-center space-x-2"><RadioGroupItem value="regular" id="r_regular" /><Label htmlFor="r_regular">Normal</Label></div>
          <div className="flex items-center space-x-2"><RadioGroupItem value="penalty" id="r_penalty" /><Label htmlFor="r_penalty">De Penal</Label></div>
          <div className="flex items-center space-x-2"><RadioGroupItem value="own_goal" id="r_own_goal" /><Label htmlFor="r_own_goal">Autogol</Label></div>
        </RadioGroup>
      </div>

      {goalType === 'own_goal' ? (
        <>
           <p className="text-sm text-muted-foreground">El gol se acreditará al equipo contrario al que cometió el autogol.</p>
            <div className="space-y-2">
              <Label>Equipo que cometió el Autogol</Label>
              <Select onValueChange={(v) => setOwnGoalTeam(v as Team)} value={ownGoalTeam}>
                <SelectTrigger><SelectValue placeholder="Seleccione un equipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="home">{teamNames.home}</SelectItem>
                  <SelectItem value="away">{teamNames.away}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
                <Label htmlFor="goal-player-number">Número de Camiseta (Jugador que cometió el autogol)</Label>
                <Input id="goal-player-number" type="number" min="1" max="999" value={jersey} onChange={(e) => setJersey(e.target.value)} />
            </div>
        </>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="goal-player-number">Número de Camiseta del Anotador (1-999):</Label>
          <Input id="goal-player-number" type="number" min="1" max="999" value={jersey} onChange={(e) => setJersey(e.target.value)} />
        </div>
      )}
    </>
  );

  const renderRemoveGoalForm = () => (
     <div className="py-4">
        <Label htmlFor="goal-player-number">Número de Camiseta del Gol a Anular:</Label>
        <Input id="goal-player-number" type="number" min="1" max="999" value={jersey} onChange={(e) => setJersey(e.target.value)} className="mt-2" />
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className={`text-2xl font-bold text-center ${isSubtraction ? 'text-remove-goal' : 'text-add-goal'}`}>
            {title}
          </DialogTitle>
           {eventTime !== undefined && !isSubtraction && (
            <DialogDescription className="text-center text-lg font-mono">
              Tiempo del evento: {formatTime(eventTime)}
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="py-4 space-y-4">
            {isSubtraction ? renderRemoveGoalForm() : renderAddOrEditGoalForm()}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button onClick={isSubtraction ? handleRemoveGoal : handleSubmit} className={`text-white font-semibold ${isSubtraction ? 'bg-remove-goal hover:bg-remove-goal-dark' : 'bg-add-goal hover:bg-add-goal-dark'}`}>
            {isEditing ? 'Guardar Cambios' : (isSubtraction ? 'Confirmar Anular Gol' : 'Confirmar Gol')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GoalModal;
