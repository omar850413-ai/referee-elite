export interface Scores {
  home: number;
  away: number;
}

export interface Fouls {
  home: number;
  away: number;
}

export interface TeamNames {
  home: string;
  away: string;
}

export interface Timer {
  status: 'NOT_STARTED' | 'FIRST_HALF' | 'HALF_TIME' | 'SECOND_HALF' | 'FINISHED';
  startTime: number;
  elapsedSeconds: number;
  isRunning: boolean;
}

export interface MatchEvent {
  id: number;
  time: string;
  category: string;
  message: string;
}

export interface MatchInfo {
  advisor: string;
  league: string;
  round: string;
  place: string;
  date: string;
}

export interface MatchState {
  scores: Scores;
  fouls: Fouls;
  timer: Timer;
  events: MatchEvent[];
  teamNames: TeamNames;
  matchInfo: MatchInfo;
}

export interface UserProfile {
  email: string;
  isApproved: boolean;
  isAdmin: boolean;
  sessionId?: string;
}
