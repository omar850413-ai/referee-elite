
'use client';

import { useReducer, useState } from 'react';
import { reducer, initialState } from '@/hooks/use-match-state';
import type { MatchState, MatchAction } from '@/lib/types';
import { Card } from '@/components/ui/card';
import TimerControl from '@/components/referee/TimerControl';
import Scoreboard from '@/components/referee/Scoreboard';
import ActionControls from '@/components/referee/ActionControls';
import CardControls from '@/components/referee/CardControls';
import SubstitutionControls from '@/components/referee/SubstitutionControls';
import EventHistory from '@/components/referee/EventHistory';
import ReportControls from '@/components/referee/ReportControls';

import GoalModal from '@/components/referee/modals/GoalModal';
import CardModal from '@/components/referee/modals/CardModal';
import NoteModal from '@/components/referee/modals/NoteModal';
import SubstitutionModal from '@/components/referee/modals/SubstitutionModal';
import ResetTimerModal from '@/components/referee/modals/ResetTimerModal';
import ResetMatchModal from '@/components/referee/modals/ResetMatchModal';
import ReportModal from '@/components/referee/modals/ReportModal';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function RefereeApp() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [isPremium, setIsPremium] = useState(false);
  const { teamNames, scores, fouls, timer, events, activeModal, modalData } = state;

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4 sm:p-6 md:p-8">
      <h1 className="text-4xl sm:text-5xl font-extrabold text-center text-primary-dark border-b-4 border-primary-dark pb-2 drop-shadow-lg">
        ⚽ Soy Asesor FMF ⚽
      </h1>

      <Card className="p-4 rounded-xl shadow-lg border border-gray-100">
        <div className="flex flex-col items-center space-y-4">
          <TimerControl timer={timer} dispatch={dispatch as React.Dispatch<MatchAction>} />
          <Scoreboard
            teamNames={teamNames}
            scores={scores}
            dispatch={dispatch as React.Dispatch<MatchAction>}
          />
        </div>
      </Card>

      <ActionControls dispatch={dispatch as React.Dispatch<MatchAction>} teamNames={teamNames} fouls={fouls} />

      <CardControls dispatch={dispatch as React.Dispatch<MatchAction>} teamNames={teamNames} />

      <SubstitutionControls dispatch={dispatch as React.Dispatch<MatchAction>} teamNames={teamNames} />

      <EventHistory events={events} teamNames={teamNames} />

      <ReportControls dispatch={dispatch as React.Dispatch<MatchAction>} />

      <div className="flex items-center justify-center space-x-2 pt-4">
        <Switch id="premium-switch" checked={isPremium} onCheckedChange={setIsPremium} />
        <Label htmlFor="premium-switch" className="font-bold text-lg text-accent">Activar Cuenta Premium ✨</Label>
      </div>

      <p className="text-xs text-center text-muted-foreground pt-4">
        ID de Usuario: <span className="font-mono">demo-user</span> | App ID: <span className="font-mono">referee-edge-v8</span>
      </p>

      {/* Modals */}
      <GoalModal
        isOpen={activeModal === 'goal'}
        dispatch={dispatch}
        modalData={modalData}
        timerIsRunning={timer.isRunning}
        teamNames={teamNames}
      />
      <CardModal
        isOpen={activeModal === 'card'}
        dispatch={dispatch}
        modalData={modalData}
        timerIsRunning={timer.isRunning}
        teamNames={teamNames}
      />
      <NoteModal
        isOpen={activeModal === 'note'}
        dispatch={dispatch}
        timerIsRunning={timer.isRunning}
      />
       <SubstitutionModal
        isOpen={activeModal === 'substitution'}
        dispatch={dispatch}
        modalData={modalData}
        timerIsRunning={timer.isRunning}
        teamNames={teamNames}
      />
      <ResetTimerModal
        isOpen={activeModal === 'reset-timer'}
        dispatch={dispatch}
      />
      <ResetMatchModal
        isOpen={activeModal === 'reset-match'}
        dispatch={dispatch}
      />
      <ReportModal
        isOpen={activeModal === 'report'}
        dispatch={dispatch}
        matchState={state as MatchState}
        isPremium={isPremium}
      />
    </div>
  );
}
