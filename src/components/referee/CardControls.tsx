'use client';

import type { MatchAction, Team, TeamNames, CardType } from '@/lib/types';
import { Button } from '@/components/ui/button';

type CardControlsProps = {
  dispatch: React.Dispatch<MatchAction>;
  teamNames: TeamNames;
};

const CardControls = ({ dispatch, teamNames }: CardControlsProps) => {
  const openCardModal = (cardType: CardType, team: Team) => {
    dispatch({ type: 'OPEN_MODAL', payload: { type: 'card', data: { cardType, team } } });
  };

  const openNoteModal = () => {
    dispatch({ type: 'OPEN_MODAL', payload: { type: 'note', data: {} } });
  };

  return (
    <div className="grid grid-cols-3 gap-3">
      {/* Home Team Cards */}
      <div className="flex flex-col space-y-3">
        <Button
          onClick={() => openCardModal('yellow', 'home')}
          className="bg-card-yellow text-gray-800 font-bold py-3 px-2 rounded-xl transition duration-200 shadow-lg flex flex-col items-center justify-center text-xs sm:text-sm w-full h-full hover:bg-yellow-400"
        >
          <span className="text-xl">🟨 {teamNames.home.toUpperCase()}</span> Amonestación
        </Button>
        <Button
          onClick={() => openCardModal('red', 'home')}
          className="bg-expel-red text-white font-bold py-3 px-2 rounded-xl transition duration-200 shadow-lg flex flex-col items-center justify-center text-xs sm:text-sm w-full h-full hover:bg-red-600"
        >
          <span className="text-xl">🟥 {teamNames.home.toUpperCase()}</span> Expulsión
        </Button>
      </div>

      {/* Annotations */}
      <div className="flex flex-col justify-center">
        <Button
          onClick={openNoteModal}
          variant="secondary"
          className="font-bold py-6 px-2 rounded-xl shadow-lg flex flex-col items-center justify-center text-sm sm:text-base h-full"
        >
          <span className="text-xl">📝</span> Anotacion Asesor
        </Button>
      </div>

      {/* Away Team Cards */}
      <div className="flex flex-col space-y-3">
        <Button
          onClick={() => openCardModal('yellow', 'away')}
          className="bg-card-yellow text-gray-800 font-bold py-3 px-2 rounded-xl transition duration-200 shadow-lg flex flex-col items-center justify-center text-xs sm:text-sm w-full h-full hover:bg-yellow-400"
        >
          <span className="text-xl">🟨 {teamNames.away.toUpperCase()}</span> Amonestación
        </Button>
        <Button
          onClick={() => openCardModal('red', 'away')}
          className="bg-expel-red text-white font-bold py-3 px-2 rounded-xl transition duration-200 shadow-lg flex flex-col items-center justify-center text-xs sm:text-sm w-full h-full hover:bg-red-600"
        >
          <span className="text-xl">🟥 {teamNames.away.toUpperCase()}</span> Expulsión
        </Button>
      </div>
    </div>
  );
};

export default CardControls;
