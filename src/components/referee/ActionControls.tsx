'use client';

import type { MatchAction, Team, TeamNames, Fouls } from '@/lib/types';
import { Button } from '@/components/ui/button';

type ActionControlsProps = {
  dispatch: React.Dispatch<MatchAction>;
  teamNames: TeamNames;
  fouls: Fouls;
};

const ActionControls = ({ dispatch, teamNames, fouls }: ActionControlsProps) => {
  const openGoalModal = (team: Team) => {
    dispatch({ type: 'OPEN_MODAL', payload: { type: 'goal', data: { team } } });
  };

  const openRemoveGoalModal = (team: Team) => {
    dispatch({ type: 'OPEN_MODAL', payload: { type: 'goal', data: { team, isSubtraction: true } } });
  };

  const handleFoul = (team: Team) => {
    dispatch({ type: 'ADD_FOUL', payload: { team } });
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Home Team Column */}
      <div className="flex flex-col space-y-3">
        <Button
          onClick={() => openGoalModal('home')}
          className="bg-add-goal hover:bg-add-goal-dark text-white font-bold py-6 text-xs sm:text-sm"
        >
          ⚽ Gol {teamNames.home.toUpperCase()} (+)
        </Button>
        <Button
          onClick={() => openRemoveGoalModal('home')}
          className="bg-remove-goal hover:bg-remove-goal-dark text-white font-bold py-6 text-xs sm:text-sm"
        >
          ➖ Quitar Gol {teamNames.home.toUpperCase()}
        </Button>
        <Button
          onClick={() => handleFoul('home')}
          className="bg-foul-button hover:bg-foul-button-hover text-gray-800 font-bold py-6 text-xs sm:text-sm flex justify-center items-center space-x-2 sm:space-x-3"
        >
          <span>Falta {teamNames.home.toUpperCase()}</span>
          <span className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 text-center text-xl sm:text-2xl font-black bg-black/20 rounded-full">
            {fouls.home}
          </span>
        </Button>
      </div>

      {/* Away Team Column */}
      <div className="flex flex-col space-y-3">
        <Button
          onClick={() => openGoalModal('away')}
          className="bg-add-goal hover:bg-add-goal-dark text-white font-bold py-6 text-xs sm:text-sm"
        >
          ⚽ Gol {teamNames.away.toUpperCase()} (+)
        </Button>
        <Button
          onClick={() => openRemoveGoalModal('away')}
          className="bg-remove-goal hover:bg-remove-goal-dark text-white font-bold py-6 text-xs sm:text-sm"
        >
          ➖ Quitar Gol {teamNames.away.toUpperCase()}
        </Button>
        <Button
          onClick={() => handleFoul('away')}
          className="bg-foul-button hover:bg-foul-button-hover text-gray-800 font-bold py-6 text-xs sm:text-sm flex justify-center items-center space-x-2 sm:space-x-3"
        >
          <span>Falta {teamNames.away.toUpperCase()}</span>
          <span className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 text-center text-xl sm:text-2xl font-black bg-black/20 rounded-full">
            {fouls.away}
          </span>
        </Button>
      </div>
    </div>
  );
};

export default ActionControls;
