'use client';
import { useState, useEffect, useRef } from 'react';
import type { MatchAction, TimerState } from '@/lib/types';
import { formatTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw } from 'lucide-react';

type TimerControlProps = {
  timer: TimerState;
  dispatch: React.Dispatch<MatchAction>;
};

const TimerControl = ({ timer, dispatch }: TimerControlProps) => {
  const { isRunning, totalPausedSeconds, startTime, period } = timer;
  const [displayTime, setDisplayTime] = useState(formatTime(totalPausedSeconds));
  const animationFrameId = useRef<number | null>(null);

  useEffect(() => {
    const getCurrentTimeSeconds = () => {
      if (isRunning) {
        const elapsedMilliseconds = Date.now() - startTime;
        const timeSinceLastStart = Math.floor(elapsedMilliseconds / 1000);
        return totalPausedSeconds + timeSinceLastStart;
      }
      return totalPausedSeconds;
    };

    const runTimerLoop = () => {
      setDisplayTime(formatTime(getCurrentTimeSeconds()));
      animationFrameId.current = requestAnimationFrame(runTimerLoop);
    };

    if (isRunning) {
      if (!animationFrameId.current) {
        runTimerLoop();
      }
    } else {
      setDisplayTime(formatTime(totalPausedSeconds));
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
    }

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
    };
  }, [isRunning, startTime, totalPausedSeconds]);

  const getPeriodStatusText = () => {
    switch (period) {
      case 'PRE_MATCH': return 'Sin Iniciar';
      case 'P1': return isRunning ? 'Primer Tiempo (Juego)' : 'Primer Tiempo (PAUSA)';
      case 'HALF_TIME': return 'ENTRETIEMPO';
      case 'P2': return isRunning ? 'Segundo Tiempo (Juego)' : 'Segundo Tiempo (PAUSA)';
      case 'FULL_TIME': return 'FINALIZADO';
      default: return '';
    }
  };

  return (
    <>
      <div className="w-full flex justify-center items-center space-x-2">
        <div className="text-5xl sm:text-7xl font-mono font-black text-foreground bg-timer-background px-6 py-3 rounded-xl shadow-inner min-w-[240px] text-center">
          {displayTime}
        </div>
        {(period === 'P1' || period === 'P2') && (
          <Button
            size="icon"
            onClick={() => dispatch({ type: 'TOGGLE_PAUSE' })}
            className={`w-16 h-16 rounded-full text-white font-bold transition duration-200 shadow-md ${
              isRunning ? 'bg-red-500 hover:bg-red-600' : 'bg-primary hover:bg-primary-dark'
            }`}
          >
            {isRunning ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8" />}
          </Button>
        )}
      </div>

      <p className="text-lg font-bold text-muted-foreground">Periodo: {getPeriodStatusText()}</p>

      <div className="flex flex-wrap justify-center gap-3 w-full">
        {period === 'PRE_MATCH' && <Button onClick={() => dispatch({ type: 'START_P1' })} className="bg-green-600 hover:bg-green-700 text-white">▶️ Inicio 1er Tiempo</Button>}
        {period === 'P1' && <Button onClick={() => dispatch({ type: 'END_P1' })} className="bg-blue-600 hover:bg-blue-700 text-white">⏸️ Finalizar 1er Tiempo</Button>}
        {period === 'HALF_TIME' && <Button onClick={() => dispatch({ type: 'START_P2' })} className="bg-green-600 hover:bg-green-700 text-white">▶️ Inicio 2do Tiempo</Button>}
        {period === 'P2' && <Button onClick={() => dispatch({ type: 'END_P2' })} className="bg-red-700 hover:bg-red-800 text-white">🏁 Finalizar Partido</Button>}
        <Button
          variant="outline"
          onClick={() => dispatch({ type: 'OPEN_MODAL', payload: { type: 'reset-timer' } })}
          className="bg-gray-500 hover:bg-gray-600 text-white"
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Reiniciar Crono
        </Button>
      </div>
    </>
  );
};

export default TimerControl;
