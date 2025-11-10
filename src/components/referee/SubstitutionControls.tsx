'use client';

import type { MatchAction, Team, TeamNames } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { RefreshCcw } from 'lucide-react';

type SubstitutionControlsProps = {
  dispatch: React.Dispatch<MatchAction>;
  teamNames: TeamNames;
};

const SubstitutionControls = ({ dispatch, teamNames }: SubstitutionControlsProps) => {
  const openSubstitutionModal = (team: Team) => {
    dispatch({ type: 'OPEN_MODAL', payload: { type: 'substitution', data: { team } } });
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      <Button
        onClick={() => openSubstitutionModal('home')}
        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-6 text-xs sm:text-sm"
      >
        <RefreshCcw className="mr-2 h-5 w-5" />
        Sustitución {teamNames.home.toUpperCase()}
      </Button>
      <Button
        onClick={() => openSubstitutionModal('away')}
        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-6 text-xs sm:text-sm"
      >
        <RefreshCcw className="mr-2 h-5 w-5" />
        Sustitución {teamNames.away.toUpperCase()}
      </Button>
    </div>
  );
};

export default SubstitutionControls;
