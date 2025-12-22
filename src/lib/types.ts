



export type Team = 'home' | 'away';
export type CardType = 'yellow' | 'red';
export type Period = 'PRE_MATCH' | 'P1' | 'HALF_TIME' | 'P2' | 'FULL_TIME';
export type ModalType = 'goal' | 'card' | 'note' | 'reset-timer' | 'reset-match' | 'report' | 'substitution';
export type GoalType = 'regular' | 'penalty' | 'own_goal';

export type Scores = { [key in Team]: number };
export type Fouls = { [key in Team]: number };
export type TeamNames = { [key in Team]: string };

export type TimerState = {
  isRunning: boolean;
  totalPausedSeconds: number;
  startTime: number;
  period: Period;
};

export type BaseEvent = {
  time: number;
};

export type PeriodStartEvent = BaseEvent & { type: 'period_start'; text: string };
export type PeriodEndEvent = BaseEvent & { type: 'period_end'; text: string };
export type GoalEvent = BaseEvent & { type: 'goal'; team: Team; jersey: number; goalType: GoalType };
export type GoalRemovedEvent = BaseEvent & { type: 'goal_removed'; team: Team; jersey: number; reason: string };
export type FoulEvent = BaseEvent & { type: 'foul'; team: Team };
export type CardEvent = BaseEvent & { type: 'yellow' | 'red'; team: Team; jersey: number | string; reason: string };
export type NoteEvent = BaseEvent & { type: 'note'; text: string };
export type SubstitutionEvent = BaseEvent & { type: 'substitution'; team: Team; playerIn: number; playerOut: number };

export type GameEvent =
  | PeriodStartEvent
  | PeriodEndEvent
  | GoalEvent
  | GoalRemovedEvent
  | FoulEvent
  | CardEvent
  | NoteEvent
  | SubstitutionEvent;
  
export interface ModalData {
  type: ModalType;
  data?: any;
}

// This type will hold the event data captured at the moment the button is pressed.
export interface PendingEvent {
    type: 'goal' | 'card' | 'note' | 'substitution';
    time: number;
    data: any;
}


export interface MatchState {
  scores: Scores;
  fouls: Fouls;
  timer: TimerState;
  events: GameEvent[];
  teamNames: TeamNames;
  activeModal: ModalType | null;
  modalData: ModalData | null;
  pendingEvent: PendingEvent | null; // Holds the event data while modal is open
}

export type MatchAction =
  | { type: 'START_P1' }
  | { type: 'END_P1' }
  | { type: 'START_P2' }
  | { type: 'END_P2' }
  | { type: 'TOGGLE_PAUSE' }
  | { type: 'UPDATE_TEAM_NAME'; payload: { team: Team; name: string } }
  | { type: 'ADD_GOAL'; payload: { team: Team; jersey: number, goalType: GoalType, time: number } }
  | { type: 'REMOVE_GOAL'; payload: { team: Team; jersey: number, time: number } }
  | { type: 'ADD_FOUL'; payload: { team: Team } }
  | { type: 'ADD_CARD'; payload: { team: Team; cardType: CardType; jersey: number | string; reason: string, time: number } }
  | { type: 'ADD_NOTE'; payload: { text: string, time: number } }
  | { type: 'ADD_SUBSTITUTION'; payload: { team: Team; playerIn: number; playerOut: number, time: number } }
  | { type: 'RESET_TIMER' }
  | { type: 'RESET_MATCH' }
  | { type: 'OPEN_MODAL'; payload: ModalData }
  | { type: 'CLOSE_MODAL' };

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  approved: boolean;
  activeSessionId?: string | null;
  sessionLastActive?: number | null;
}
