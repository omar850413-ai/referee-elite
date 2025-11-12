
'use client';
import type { MatchAction, MatchState, GameEvent, Team, GoalEvent } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatTime } from '@/lib/utils';
import { toJpeg } from 'html-to-image';
import { useRef } from 'react';

type ReportModalProps = {
  isOpen: boolean;
  dispatch: React.Dispatch<MatchAction>;
  matchState: MatchState;
};

const ReportModal = ({ isOpen, dispatch, matchState }: ReportModalProps) => {
  const reportContentRef = useRef<HTMLDivElement>(null);
  
  const handleClose = () => {
    dispatch({ type: 'CLOSE_MODAL' });
  };

  const handleDownloadImage = () => {
    if (reportContentRef.current === null) {
      return;
    }

    toJpeg(reportContentRef.current, { cacheBust: true, backgroundColor: '#ffffff' })
      .then((dataUrl) => {
        const link = document.createElement('a');
        link.download = 'informe-partido.jpg';
        link.href = dataUrl;
        link.click();
      })
      .catch((err) => {
        console.error('oops, something went wrong!', err);
      });
  };

  const { scores, fouls, teamNames, events, timer } = matchState;
  const finalTime = formatTime(timer.totalPausedSeconds + (timer.isRunning ? (Date.now() - timer.startTime) / 1000 : 0));
  const currentDate = new Date().toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const currentTime = new Date().toLocaleTimeString('es-MX');

  const filterAndSort = (team: Team, type: GameEvent['type']) =>
    events.filter((e) => e.team === team && e.type === type).sort((a, b) => a.time - b.time);

  const homeYellows = filterAndSort('home', 'yellow');
  const homeReds = filterAndSort('home', 'red');
  const homeGoals = filterAndSort('home', 'goal') as GoalEvent[];
  const homeSubs = filterAndSort('home', 'substitution');
  const awayYellows = filterAndSort('away', 'yellow');
  const awayReds = filterAndSort('away', 'red');
  const awayGoals = filterAndSort('away', 'goal') as GoalEvent[];
  const awaySubs = filterAndSort('away', 'substitution');

  const judgeIncidents = events
    .filter((e) => e.type === 'note' || e.type === 'goal_removed')
    .sort((a, b) => a.time - b.time);
    
  const formatJerseyForReport = (jersey: number | string) => {
      if (typeof jersey === 'string') {
        return jersey;
      }
      return `#${jersey}`;
  };

  const generateIncidentTable = (incidents: GameEvent[], type: 'cards' | 'goals' | 'subs') => {
    if (incidents.length === 0) {
      return '<p class="text-sm text-gray-500 italic">No hay incidencias registradas.</p>';
    }
    
    let headers = '';
    let rows = '';

    switch(type) {
      case 'goals':
        headers = '<thead><tr><th>Tiempo</th><th># Camiseta</th><th>Tipo</th></tr></thead>';
        rows = incidents.map(e => {
          if(e.type !== 'goal') return '';
          const goalEvent = e as GoalEvent;
          let goalTypeDesc = "Gol";
          if (goalEvent.goalType === 'penalty') goalTypeDesc = "De Penal";
          if (goalEvent.goalType === 'own_goal') {
            const opposingTeam = teamNames[goalEvent.team === 'home' ? 'away' : 'home'];
            goalTypeDesc = `Autogol (${opposingTeam})`;
          }
          return `<tr><td>${formatTime(e.time)}</td><td>#${goalEvent.jersey}</td><td>${goalTypeDesc}</td></tr>`;
        }).join('');
        break;
      case 'cards':
        headers = '<thead><tr><th>Tiempo</th><th>Identificación</th><th>Causa</th></tr></thead>';
        rows = incidents.map(e => {
          if(e.type !== 'yellow' && e.type !== 'red') return '';
          const cardIcon = e.type === 'yellow' ? '🟨' : '🟥';
          return `<tr><td>${formatTime(e.time)}</td><td>${cardIcon} ${formatJerseyForReport(e.jersey)}</td><td>${e.reason}</td></tr>`;
        }).join('');
        break;
      case 'subs':
        headers = '<thead><tr><th>Tiempo</th><th>Sale #</th><th>Entra #</th></tr></thead>';
        rows = incidents.map(e => {
          if(e.type !== 'substitution') return '';
          return `<tr><td>${formatTime(e.time)}</td><td>${e.playerOut}</td><td>${e.playerIn}</td></tr>`;
        }).join('');
        break;
    }

    return `
      <table class="report-table">
        ${headers}
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-4xl w-[95%]">
        <ScrollArea className="max-h-[85vh]">
          <div id="report-modal-content" ref={reportContentRef} className="bg-white p-4">
            <DialogHeader className="report-title-section">
              <DialogTitle className="text-3xl font-extrabold mb-2 text-center text-primary-dark">
                Reporte Oficial de Partido
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 text-gray-800">
              <div className="text-center mb-6 border-b-2 border-gray-300 pb-4 report-title-section">
                <p className="text-sm text-gray-500 mb-1">
                  Generado: {currentDate} {currentTime} hrs
                </p>
                <h2 className="text-4xl font-extrabold text-gray-800 mb-1">Resultado Final</h2>
                <p className="text-6xl font-black text-primary-dark">
                  {teamNames.home} <span className="text-gray-700">{scores.home}</span> -{' '}
                  <span className="text-gray-700">{scores.away}</span> {teamNames.away}
                </p>
                <p className="text-xl text-gray-600 font-semibold mt-2">
                  Tiempo Total de Juego: {finalTime}
                </p>
              </div>

              <div id="incidents-detail-grid" className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {['home', 'away'].map((team) => (
                  <div key={team} className="p-4 rounded-xl space-y-4 incident-section">
                    <h4 className="text-xl font-extrabold text-primary-dark border-b-2 border-primary-dark pb-1">
                      {teamNames[team as Team]} ({team === 'home' ? 'LOCAL' : 'VISITANTE'})
                    </h4>
                    <div dangerouslySetInnerHTML={{ __html: `<h5>⚽ Goles Anotados (${team === 'home' ? scores.home : scores.away})</h5>${generateIncidentTable(team === 'home' ? homeGoals : awayGoals, 'goals')}` }} />
                    <div dangerouslySetInnerHTML={{ __html: `<h5>🔄 Sustituciones (${team === 'home' ? homeSubs.length : awaySubs.length})</h5>${generateIncidentTable(team === 'home' ? homeSubs : awaySubs, 'subs')}` }} />
                    <div dangerouslySetInnerHTML={{ __html: `<h5>🟨 Amonestaciones (${team === 'home' ? homeYellows.length : awayYellows.length})</h5>${generateIncidentTable(team === 'home' ? homeYellows : awayYellows, 'cards')}` }} />
                    <div dangerouslySetInnerHTML={{ __html: `<h5>🟥 Expulsiones (${team === 'home' ? homeReds.length : awayReds.length})</h5>${generateIncidentTable(team === 'home' ? homeReds : awayReds, 'cards')}` }} />
                    <div>
                      <h5>🚨 Faltas Cometidas</h5>
                      <p className="text-lg font-bold">{fouls[team as Team]}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className='incident-section p-4 rounded-xl'>
                <h3 className="text-2xl font-bold text-gray-700 mb-4 border-b pb-2">Anotaciones del Asesor y Correcciones</h3>
                {judgeIncidents.length > 0 ? (
                   <ul className="space-y-2 text-sm">
                    {judgeIncidents.map((e, i) => (
                      <li key={i} className={`p-3 border rounded-lg shadow-sm ${e.type === 'note' ? 'bg-secondary/10 border-secondary' : 'bg-remove-goal/10 border-remove-goal'}`}>
                         <b>{formatTime(e.time)}:</b> {e.type === 'note' ? e.text : `GOL CORREGIDO #${e.jersey} (${teamNames[e.team!]})`}
                      </li>
                    ))}
                   </ul>
                ) : <p className="text-gray-500 italic">No hay anotaciones.</p>}
              </div>

            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="mt-4 no-print border-t pt-4 flex-wrap justify-end">
          <Button variant="outline" onClick={handleClose} className="mb-2 sm:mb-0">
            Cerrar
          </Button>
          <Button onClick={handleDownloadImage} className="bg-indigo-600 hover:bg-indigo-700 mb-2 sm:mb-0">
            Descargar Informe como Imagen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReportModal;
