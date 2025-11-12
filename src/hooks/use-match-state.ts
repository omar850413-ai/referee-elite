'use client';
import { useReducer, useEffect } from 'react';
import type { MatchState, MatchAction } from '@/lib/types';
import { toast } from '@/hooks/use-toast';

const LOCAL_STORAGE_KEY = 'referee-edge-match-state';

// Function to load state from localStorage
const loadState = (): MatchState => {
  try {
    if (typeof window === 'undefined') {
      return initialState;
    }
    const serializedState = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (serializedState === null) {
      return initialState;
    }
    const storedState = JSON.parse(serializedState);
    // Basic validation to prevent loading corrupted data
    if (storedState.scores && storedState.timer) {
      // The timer should not persist in a running state on reload.
      // We pause it and adjust the time to be accurate.
      if (storedState.timer.isRunning) {
        const elapsedMilliseconds = Date.now() - storedState.timer.startTime;
        storedState.timer.totalPausedSeconds += Math.floor(elapsedMilliseconds / 1000);
        storedState.timer.isRunning = false;
      }
      return storedState;
    }
  } catch (error) {
    console.error("Error loading state from localStorage:", error);
  }
  return initialState;
};


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
      const p2startTime = 45 * 60; // 2700 seconds for a clean 45:00 start for P2
      return {
        ...state,
        timer: { isRunning: true, totalPausedSeconds: p2startTime, startTime: Date.now(), period: 'P2' },
        events: [
          ...state.events,
          { type: 'period_start', text: 'Inicio Segundo Tiempo (45:00)', time: p2startTime },
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
      if (!state.timer.isRunning && state.timer.period !== 'HALF_TIME') {
        toast({ variant: 'destructive', title: 'Error', description: 'Las sustituciones solo se pueden registrar durante el juego o en el entretiempo.' });
        return state;
      }
      const { team, playerIn, playerOut } = action.payload;
      // If substitution is during halftime, force the time to 45:00.
      const substitutionTime = state.timer.period === 'HALF_TIME' ? 45 * 60 : currentTime;
      return {
        ...state,
        events: [...state.events, { type: 'substitution', team, time: substitutionTime, playerIn, playerOut }],
      };
    }

    case 'RESET_TIMER':
      return {
        ...state,
        timer: { ...initialState.timer },
      };

    case 'RESET_MATCH':
      // Also clear localStorage on explicit reset
      if (typeof window !== 'undefined') {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      }
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

// Custom hook that combines the reducer with localStorage persistence
export const usePersistentMatchState = () => {
  const [state, dispatch] = useReducer(reducer, loadState());

  // Effect to save state to localStorage whenever it changes
  useEffect(() => {
    try {
      // Don't save if it's the very initial state before a match starts
      if (state.timer.period !== 'PRE_MATCH' || state.events.length > 0) {
        const serializedState = JSON.stringify(state);
        localStorage.setItem(LOCAL_STORAGE_KEY, serializedState);
      }
    } catch (error) {
      console.error("Error saving state to localStorage:", error);
    }
  }, [state]);

  return [state, dispatch] as const;
};

// Keep the old export for compatibility if other components use it directly,
// but the main page should switch to usePersistentMatchState.
export const useMatchState = () => {
    return useReducer(reducer, initialState);
}
