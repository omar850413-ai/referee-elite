
'use client';

import { useReducer, useEffect } from 'react';
import { reducer, initialState, usePersistentMatchState } from '@/hooks/use-match-state';
import type { MatchState, MatchAction } from '@/lib/types';
import { Card } from '@/components/ui/card';
import TimerControl from '@/components/referee/TimerControl';
import Scoreboard from '@/components/referee/Scoreboard';
import ActionControls from '@/components/referee/ActionControls';
import CardControls from '@/components/referee/CardControls';
import SubstitutionControls from '@/components/referee/SubstitutionControls';
import EventHistory from '@/components/referee/EventHistory';
import ReportControls from '@/components/referee/ReportControls';

import GoalModal from '@/components/referee/modals/GoalModal';
import CardModal from '@/components/referee/modals/CardModal';
import NoteModal from '@/components/referee/modals/NoteModal';
import SubstitutionModal from '@/components/referee/modals/SubstitutionModal';
import ResetTimerModal from '@/components/referee/modals/ResetTimerModal';
import ResetMatchModal from '@/components/referee/modals/ResetMatchModal';
import ReportModal from '@/components/referee/modals/ReportModal';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShieldCheck, LogOut } from 'lucide-react';
import { useAdmin } from '@/context/AdminContext';
import { useAuth, useFirestore, useUser } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { doc, updateDoc } from 'firebase/firestore';

export default function RefereeApp() {
  const { isAdmin } = useAdmin(); // Consume the context to get admin status
  const [state, dispatch] = usePersistentMatchState(); // Use the new persistent hook
  const { teamNames, scores, fouls, timer, events, activeModal, modalData } = state;

  const auth = useAuth();
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  
  useEffect(() => {
    // This robust back button prevention logic ensures the app state is not lost.
    // 1. Push a "trap" state into the history.
    window.history.pushState(null, '', window.location.href);

    // 2. Set up a listener for when the user tries to go back.
    const handleBackButton = (event: PopStateEvent) => {
      // 3. When the back button is pressed, immediately push the "trap" state back.
      // This cancels the navigation and keeps the user on the current page.
      window.history.pushState(null, '', window.location.href);
    };

    window.addEventListener('popstate', handleBackButton);

    // 4. Clean up the listener when the component unmounts (e.g., on logout).
    return () => {
      window.removeEventListener('popstate', handleBackButton);
    };
  }, []); // The empty dependency array ensures this runs only once.


  const handleLogout = async () => {
    if (user && firestore) {
      const userDocRef = doc(firestore, 'users', user.uid);
      try {
        await updateDoc(userDocRef, { activeSessionId: null, sessionLastActive: null });
      } catch (error) {
        console.error("Error clearing session on logout:", error)
      }
    }
    
    signOut(auth).then(() => {
        router.push('/login');
    });
  };


  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4 sm:p-6 md:p-8">
       <header className="flex justify-between items-center border-b-4 border-primary-dark pb-2 drop-shadow-lg mb-4">
        <h1 className="text-2xl sm:text-4xl font-black tracking-tighter text-primary-dark [text-shadow:1px_1px_0px_hsl(var(--muted-foreground)),2px_2px_0px_hsl(var(--secondary))]">
          ⚽ Soy Asesor FMF ⚽
        </h1>
        {isAdmin && (
          <Button asChild variant="outline" className="border-2 border-primary text-primary hover:bg-primary/10 font-bold">
            <Link href="/admin">
              <ShieldCheck className="mr-2 h-4 w-4" />
              Panel de Admin
            </Link>
          </Button>
        )}
      </header>

      <Card className="p-4 rounded-xl shadow-lg border border-gray-100 dark:border-border">
        <div className="flex flex-col items-center space-y-4">
          <TimerControl timer={timer} dispatch={dispatch as React.Dispatch<MatchAction>} />
          <Scoreboard
            teamNames={teamNames}
            scores={scores}
            dispatch={dispatch as React.Dispatch<MatchAction>}
          />
        </div>
      </Card>

      <ActionControls dispatch={dispatch as React.Dispatch<MatchAction>} teamNames={teamNames} fouls={fouls} />

      <CardControls dispatch={dispatch as React.Dispatch<MatchAction>} teamNames={teamNames} />

      <SubstitutionControls dispatch={dispatch as React.Dispatch<MatchAction>} teamNames={teamNames} />

      <EventHistory events={events} teamNames={teamNames} />

      <ReportControls dispatch={dispatch as React.Dispatch<MatchAction>} />

      <div className="pt-6 border-t">
        <Button
          variant="outline"
          onClick={handleLogout}
          className="w-full text-lg py-6"
        >
          <LogOut className="mr-2 h-5 w-5" />
          Cerrar Sesión
        </Button>
      </div>

      <p className="text-xs text-center text-muted-foreground pt-4">
        App ID: <span className="font-mono">referee-edge-v8-public</span>
      </p>
      
      <p className="text-xs text-center text-muted-foreground pt-1">
        by OmarSaldaña
      </p>

      {/* Modals */}
      <GoalModal
        isOpen={activeModal === 'goal'}
        dispatch={dispatch}
        modalData={modalData}
        timerIsRunning={timer.isRunning}
        teamNames={teamNames}
      />
      <CardModal
        isOpen={activeModal === 'card'}
        dispatch={dispatch}
        modalData={modalData}
        timerIsRunning={timer.isRunning}
        teamNames={teamNames}
      />
      <NoteModal
        isOpen={activeModal === 'note'}
        dispatch={dispatch}
        timerIsRunning={timer.isRunning}
      />
       <SubstitutionModal
        isOpen={activeModal === 'substitution'}
        dispatch={dispatch}
        modalData={modalData}
        timerIsRunning={timer.isRunning}
        period={timer.period}
        teamNames={teamNames}
      />
      <ResetTimerModal
        isOpen={activeModal === 'reset-timer'}
        dispatch={dispatch}
      />
      <ResetMatchModal
        isOpen={activeModal === 'reset-match'}
        dispatch={dispatch}
      />
      <ReportModal
        isOpen={activeModal === 'report'}
        dispatch={dispatch}
        matchState={state as MatchState}
      />
    </div>
  );
}
