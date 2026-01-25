
'use client';
import { useReducer, useEffect } from 'react';
import type { MatchState, MatchAction, GameEvent, Scores, Fouls } from '@/lib/types';
import { toast } from '@/hooks/use-toast';

const LOCAL_STORAGE_KEY = 'referee-edge-match-state';

// Helper function to derive scores and fouls from the event history
// This is the source of truth and prevents state desynchronization
const recalculateScoresAndFouls = (events: GameEvent[]) => {
  const newScores: Scores = { home: 0, away: 0 };
  const newFouls: Fouls = { home: 0, away: 0 };

  for (const event of events) {
    if (event.type === 'goal') {
      newScores[event.team]++;
    } else if (event.type === 'goal_removed') {
      // Ensure score doesn't go below zero
      if (newScores[event.team] > 0) {
        newScores[event.team]--;
      }
    } else if (event.type === 'foul') {
      newFouls[event.team]++;
    }
  }
  return { newScores, newFouls };
};


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
      // If the timer was running when the page was closed/reloaded,
      // calculate the elapsed time and keep it running.
      if (storedState.timer.isRunning && storedState.timer.startTime > 0) {
        const elapsedMilliseconds = Date.now() - storedState.timer.startTime;
        const elapsedSeconds = Math.floor(elapsedMilliseconds / 1000);
        
        // Update the total time with what passed during the refresh
        storedState.timer.totalPausedSeconds += elapsedSeconds;
        // Set a new start time to the current moment to continue counting
        storedState.timer.startTime = Date.now();
        // KEEP IT RUNNING
        storedState.timer.isRunning = true;
      } else {
        // If it was paused, keep it paused.
        storedState.timer.isRunning = false;
      }
      
      // Ensure transient state is cleared on load
      storedState.pendingEvent = null;
      storedState.editingEvent = null;
      storedState.activeModal = null;

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
  pendingEvent: null,
  editingEvent: null,
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
          { id: crypto.randomUUID(), type: 'period_start', text: 'Inicio Primer Tiempo', time: 0 },
        ],
      };

    case 'END_P1':
      return {
        ...state,
        timer: { ...state.timer, isRunning: false, totalPausedSeconds: currentTime, period: 'HALF_TIME' },
        events: [
          ...state.events,
          { id: crypto.randomUUID(), type: 'period_end', text: 'Final del Primer Tiempo', time: currentTime },
        ],
      };

    case 'START_P2':
      const p2startTime = 45 * 60; // 2700 seconds for a clean 45:00 start for P2
      return {
        ...state,
        timer: { isRunning: true, totalPausedSeconds: p2startTime, startTime: Date.now(), period: 'P2' },
        events: [
          ...state.events,
          { id: crypto.randomUUID(), type: 'period_start', text: 'Inicio Segundo Tiempo (45:00)', time: p2startTime },
        ],
      };

    case 'END_P2':
      return {
        ...state,
        timer: { ...state.timer, isRunning: false, totalPausedSeconds: currentTime, period: 'FULL_TIME' },
        events: [
          ...state.events,
          { id: crypto.randomUUID(), type: 'period_end', text: 'Final del Partido', time: currentTime },
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
      const { team, jersey, goalType, time } = action.payload;
      const newEvents = [...state.events, { id: crypto.randomUUID(), type: 'goal', team, time, jersey, goalType }];
      const { newScores } = recalculateScoresAndFouls(newEvents);
      return {
        ...state,
        scores: newScores,
        events: newEvents,
        pendingEvent: null,
      };
    }

    case 'REMOVE_GOAL': {
      const { team, jersey, time } = action.payload;
      if (state.scores[team] <= 0) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se puede quitar gol con marcador en cero.' });
        return state;
      }
      const newEvents = [
          ...state.events,
          { id: crypto.randomUUID(), type: 'goal_removed', team, time, jersey, reason: 'Corrección manual' },
      ];
      const { newScores } = recalculateScoresAndFouls(newEvents);
      return {
        ...state,
        scores: newScores,
        events: newEvents,
        pendingEvent: null, // Clear pending event
      };
    }

    case 'ADD_FOUL': {
      const { team } = action.payload;
       if (!state.timer.isRunning) {
        toast({ variant: 'destructive', title: 'Error', description: 'El cronómetro debe estar corriendo.' });
        return state;
      }
      const newEvents = [...state.events, { id: crypto.randomUUID(), type: 'foul', team, time: currentTime }];
      const { newFouls } = recalculateScoresAndFouls(newEvents);
      return {
        ...state,
        fouls: newFouls,
        events: newEvents,
      };
    }
    
    case 'ADD_CARD': {
      const { team, cardType, jersey, reason, time } = action.payload;
      return {
        ...state,
        events: [...state.events, { id: crypto.randomUUID(), type: cardType, team, time, jersey, reason }],
        pendingEvent: null, // Clear pending event
      };
    }

    case 'ADD_NOTE': {
       const { text, time } = action.payload;
      return {
        ...state,
        events: [...state.events, { id: crypto.randomUUID(), type: 'note', text, time }],
        pendingEvent: null, // Clear pending event
      };
    }

    case 'ADD_SUBSTITUTION': {
      const { team, playerIn, playerOut, time } = action.payload;
      return {
        ...state,
        events: [...state.events, { id: crypto.randomUUID(), type: 'substitution', team, time, playerIn, playerOut }],
        pendingEvent: null, // Clear pending event
      };
    }
    
    case 'UPDATE_EVENT': {
      const { updatedEvent } = action.payload;
      const newEvents = state.events.map(e => e.id === updatedEvent.id ? updatedEvent : e);
      // Recalculate scores and fouls as they might have changed
      const { newScores, newFouls } = recalculateScoresAndFouls(newEvents);
      return {
        ...state,
        events: newEvents,
        scores: newScores,
        fouls: newFouls,
        editingEvent: null, // Clear editing state
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
      const { type, data, eventToEdit } = action.payload;

      if (eventToEdit) {
         return {
          ...state,
          activeModal: type,
          modalData: action.payload,
          editingEvent: eventToEdit,
          pendingEvent: null, // Not a new event
        };
      }
      
      // For event types that need precise timing, capture it here.
      const isTimedEvent = ['goal', 'card', 'note', 'substitution'].includes(type);
      
      if (isTimedEvent && !state.timer.isRunning && state.timer.period !== 'HALF_TIME' && type !== 'note' && !(type === 'goal' && data.isSubtraction)) {
         toast({
           variant: 'destructive',
           title: 'Error',
           description: 'El cronómetro debe estar corriendo para registrar este evento.',
         });
         return state; // Abort opening the modal
      }

      // For substitutions, allow at half-time even if timer is stopped.
      const substitutionTime = state.timer.period === 'HALF_TIME' ? 45 * 60 : currentTime;
      const eventTime = type === 'substitution' ? substitutionTime : currentTime;

      return {
        ...state,
        activeModal: type,
        modalData: action.payload,
        editingEvent: null, // Not editing
        // Create a pending event with the *current* time
        pendingEvent: isTimedEvent ? { type, time: eventTime, data } : null,
      };

    case 'CLOSE_MODAL':
      return {
        ...state,
        activeModal: null,
        modalData: null,
        pendingEvent: null, // Clear any pending event when a modal is closed
        editingEvent: null,
      };

    default:
      return state;
  }
}

// Custom hook that combines the reducer with localStorage persistence
export const usePersistentMatchState = () => {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);

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
