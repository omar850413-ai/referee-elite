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
  firstHalfEndSeconds?: number;
}

export interface Player {
  id: string;
  number: string;
  name: string;
  type: 'starter' | 'substitute';
  replacedNumber?: string;
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
}

export interface MatchTiming {
  firstHalfStart: string;
  firstHalfEnd: string;
  secondHalfStart: string;
  secondHalfEnd: string;
}

export interface MatchEvent {
  id: number;
  time: string;
  category: string;
  message: string;
  side?: 'home' | 'away';
  pdfDescription?: string;
  valuation?: 'correcta' | 'incorrecta';
  playerNumber?: string;
  playerName?: string;
}

export interface MatchInfo {
  advisor: string;
  league: string;
  round: string;
  place: string;
  date: string;
  referee?: string;
  assistant1?: string;
  assistant2?: string;
  fourthOfficial?: string;
  var?: string;
  avar?: string;
}

export interface PenaltyShootout {
  home: number;
  away: number;
  active: boolean;
}

export interface ReportSettings {
  showFouls: boolean;
}

export interface Signatures {
  captainHome?: string;
  captainAway?: string;
  referee?: string;
}

export interface MatchState {
  id?: string;
  title: string;
  scores: Scores;
  fouls: Fouls;
  timer: Timer;
  events: MatchEvent[];
  teamNames: TeamNames;
  matchInfo: MatchInfo;
  penaltyShootout?: PenaltyShootout;
  reportSettings?: ReportSettings;
  lineups: {
    home: Player[];
    away: Player[];
  };
  staff: {
    home: StaffMember[];
    away: StaffMember[];
  };
  attendance?: string;
  timing?: MatchTiming;
  signatures?: Signatures;
  ownerId: string;
  createdAt?: number;
}

export interface UserProfile {
  email: string;
  isApproved: boolean;
  isAdmin: boolean;
  sessionId?: string;
  appId?: string; 
}
