
'use client';

import { useReducer } from 'react';
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

export default function RefereeApp() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { teamNames, scores, fouls, timer, events, activeModal, modalData } = state;

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4 sm:p-6 md:p-8">
       <header className="flex justify-center items-center border-b-4 border-primary-dark pb-2 drop-shadow-lg">
        <h1 className="text-2xl sm:text-4xl font-black tracking-tighter text-primary-dark [text-shadow:1px_1px_0px_hsl(var(--muted-foreground)),2px_2px_0px_hsl(var(--secondary))]">
          ⚽ Soy Asesor FMF ⚽
        </h1>
      </header>

      <Card className="p-4 rounded-xl shadow-lg border border-gray-100 dark:border-border">
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

      <p className="text-xs text-center text-muted-foreground pt-4">
        App ID: <span className="font-mono">referee-edge-v8-public</span>
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
        period={timer.period}
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
      />
    </div>
  );
}
