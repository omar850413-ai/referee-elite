'use client';
import { useReducer } from 'react';
import type { MatchState, MatchAction } from '@/lib/types';
import { toast } from '@/hooks/use-toast';

export const initialState: MatchState = {
  scores: { home: 0, away: 0 },
  fouls: { home: 0, away: 0 },
  timer: {
    isRunning: false,
    totalPausedSeconds: 0,
    startTime: 0,
    period: 'PRE_MATCH',
  },
  events: [],
  teamNames: { home: 'LOCAL', away: 'VISITANTE' },
  activeModal: null,
  modalData: null,
};

const getCurrentTimeSeconds = (timer: MatchState['timer']): number => {
  if (timer.isRunning) {
    const elapsedMilliseconds = Date.now() - timer.startTime;
    return timer.totalPausedSeconds + Math.floor(elapsedMilliseconds / 1000);
  }
  return timer.totalPausedSeconds;
};

export function reducer(state: MatchState, action: MatchAction): MatchState {
  const currentTime = getCurrentTimeSeconds(state.timer);

  switch (action.type) {
    case 'START_P1':
      return {
        ...state,
        timer: { isRunning: true, totalPausedSeconds: 0, startTime: Date.now(), period: 'P1' },
        events: [
          ...state.events,
          { type: 'period_start', text: 'Inicio Primer Tiempo', time: 0 },
        ],
      };

    case 'END_P1':
      return {
        ...state,
        timer: { ...state.timer, isRunning: false, totalPausedSeconds: currentTime, period: 'HALF_TIME' },
        events: [
          ...state.events,
          { type: 'period_end', text: 'Final del Primer Tiempo', time: currentTime },
        ],
      };

    case 'START_P2':
      const p2startTime = 46 * 60; // 2760 seconds
      return {
        ...state,
        timer: { isRunning: true, totalPausedSeconds: p2startTime, startTime: Date.now(), period: 'P2' },
        events: [
          ...state.events,
          { type: 'period_start', text: 'Inicio Segundo Tiempo (46:00)', time: p2startTime },
        ],
      };

    case 'END_P2':
      return {
        ...state,
        timer: { ...state.timer, isRunning: false, totalPausedSeconds: currentTime, period: 'FULL_TIME' },
        events: [
          ...state.events,
          { type: 'period_end', text: 'Final del Partido', time: currentTime },
        ],
      };

    case 'TOGGLE_PAUSE':
      if (state.timer.isRunning) {
        // Pausing
        return {
          ...state,
          timer: { ...state.timer, isRunning: false, totalPausedSeconds: currentTime },
        };
      } else {
        // Resuming
        return {
          ...state,
          timer: { ...state.timer, isRunning: true, startTime: Date.now() },
        };
      }

    case 'UPDATE_TEAM_NAME':
      const { team, name } = action.payload;
      return {
        ...state,
        teamNames: { ...state.teamNames, [team]: name.toUpperCase() },
      };

    case 'ADD_GOAL': {
      const { team, jersey } = action.payload;
      return {
        ...state,
        scores: { ...state.scores, [team]: state.scores[team] + 1 },
        events: [...state.events, { type: 'goal', team, time: currentTime, jersey }],
      };
    }

    case 'REMOVE_GOAL': {
      const { team, jersey } = action.payload;
      if (state.scores[team] <= 0) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se puede quitar gol con marcador en cero.' });
        return state;
      }
      return {
        ...state,
        scores: { ...state.scores, [team]: state.scores[team] - 1 },
        events: [
          ...state.events,
          { type: 'goal_removed', team, time: currentTime, jersey, reason: 'Corrección manual' },
        ],
      };
    }

    case 'ADD_FOUL': {
      const { team } = action.payload;
       if (!state.timer.isRunning) {
        toast({ variant: 'destructive', title: 'Error', description: 'El cronómetro debe estar corriendo.' });
        return state;
      }
      return {
        ...state,
        fouls: { ...state.fouls, [team]: state.fouls[team] + 1 },
        events: [...state.events, { type: 'foul', team, time: currentTime }],
      };
    }
    
    case 'ADD_CARD': {
      const { team, cardType, jersey, reason } = action.payload;
      return {
        ...state,
        events: [...state.events, { type: cardType, team, time: currentTime, jersey, reason }],
      };
    }

    case 'ADD_NOTE': {
      return {
        ...state,
        events: [...state.events, { type: 'note', text: action.payload.text, time: currentTime }],
      };
    }

    case 'ADD_SUBSTITUTION': {
      if (!state.timer.isRunning) {
        toast({ variant: 'destructive', title: 'Error', description: 'El cronómetro debe estar corriendo para registrar una sustitución.' });
        return state;
      }
      const { team, playerIn, playerOut } = action.payload;
      return {
        ...state,
        events: [...state.events, { type: 'substitution', team, time: currentTime, playerIn, playerOut }],
      };
    }

    case 'RESET_TIMER':
      return {
        ...state,
        timer: { ...initialState.timer },
      };

    case 'RESET_MATCH':
      return initialState;

    case 'OPEN_MODAL':
      return {
        ...state,
        activeModal: action.payload.type,
        modalData: action.payload,
      };

    case 'CLOSE_MODAL':
      return {
        ...state,
        activeModal: null,
        modalData: null,
      };

    default:
      return state;
  }
}

export const useMatchState = () => {
    return useReducer(reducer, initialState);
}
