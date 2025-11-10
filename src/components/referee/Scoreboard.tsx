'use client';

import type { MatchAction, TeamNames, Scores, Team } from '@/lib/types';
import { Input } from '@/components/ui/input';

type ScoreboardProps = {
  teamNames: TeamNames;
  scores: Scores;
  dispatch: React.Dispatch<MatchAction>;
};

const Scoreboard = ({ teamNames, scores, dispatch }: ScoreboardProps) => {
  const handleNameChange = (team: Team, name: string) => {
    dispatch({ type: 'UPDATE_TEAM_NAME', payload: { team, name } });
  };
  
  const handleBlur = (team: Team, name: string) => {
    if (!name.trim()) {
      dispatch({ type: 'UPDATE_TEAM_NAME', payload: { team, name: team === 'home' ? 'LOCAL' : 'VISITANTE' } });
    }
  };

  return (
    <div className="w-full flex justify-center items-start pt-4">
      {/* Home Team */}
      <div className="flex flex-col items-center space-y-2 flex-1 max-w-[45%]">
        <Input
          id="home-team-name"
          value={teamNames.home}
          onChange={(e) => handleNameChange('home', e.target.value)}
          onBlur={(e) => handleBlur('home', e.target.value)}
          placeholder="Nombre Local"
          className="text-xl font-extrabold text-center border-0 border-b-2 border-primary focus:border-primary-dark focus-visible:ring-0 rounded-none p-1 w-full truncate bg-transparent"
        />
        <span id="home-score" className="text-6xl sm:text-8xl font-black text-primary-dark">
          {scores.home}
        </span>
      </div>

      {/* Separator */}
      <span className="text-5xl sm:text-6xl font-black text-gray-300 mx-2 mt-8">-</span>

      {/* Away Team */}
      <div className="flex flex-col items-center space-y-2 flex-1 max-w-[45%]">
        <Input
          id="away-team-name"
          value={teamNames.away}
          onChange={(e) => handleNameChange('away', e.target.value)}
          onBlur={(e) => handleBlur('away', e.target.value)}
          placeholder="Nombre Visitante"
          className="text-xl font-extrabold text-center border-0 border-b-2 border-primary focus:border-primary-dark focus-visible:ring-0 rounded-none p-1 w-full truncate bg-transparent"
        />
        <span id="away-score" className="text-6xl sm:text-8xl font-black text-primary-dark">
          {scores.away}
        </span>
      </div>
    </div>
  );
};

export default Scoreboard;
