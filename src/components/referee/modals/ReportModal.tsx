'use client';
import type { MatchAction, MatchState, GameEvent, Team } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatTime } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';

type ReportModalProps = {
  isOpen: boolean;
  dispatch: React.Dispatch<MatchAction>;
  matchState: MatchState;
};

const ReportModal = ({ isOpen, dispatch, matchState }: ReportModalProps) => {
  const handleClose = () => {
    dispatch({ type: 'CLOSE_MODAL' });
  };

  const handlePrint = () => {
    window.print();
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
  const homeGoals = filterAndSort('home', 'goal');
  const awayYellows = filterAndSort('away', 'yellow');
  const awayReds = filterAndSort('away', 'red');
  const awayGoals = filterAndSort('away', 'goal');

  const judgeIncidents = events
    .filter((e) => e.type === 'note' || e.type === 'goal_removed')
    .sort((a, b) => a.time - b.time);
    
  const formatJerseyForReport = (jersey: number | string) => {
      if (typeof jersey === 'string') {
        return jersey;
      }
      return `#${jersey}`;
  };

  const generateIncidentTable = (incidents: GameEvent[]) => {
    if (incidents.length === 0) {
      return '<p class="text-sm text-gray-500 italic">No hay incidencias registradas.</p>';
    }
    return `
      <table class="report-table min-w-full">
        <thead><tr><th>Tiempo</th><th>Identificación</th><th>Detalle</th></tr></thead>
        <tbody>
          ${incidents
            .map((e) => {
              if (e.type !== 'goal' && e.type !== 'yellow' && e.type !== 'red') return '';
              let detail = '';
              let identification = '';
              if (e.type === 'goal') {
                detail = 'Gol Anotado';
                identification = `#${e.jersey}`;
              } else { // yellow or red card
                detail = `Causa: ${e.reason}`;
                identification = formatJerseyForReport(e.jersey);
              }
              return `<tr><td>${formatTime(e.time)}</td><td>${identification}</td><td>${detail}</td></tr>`;
            })
            .join('')}
        </tbody>
      </table>
    `;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-4xl w-[95%]">
        <div id="report-modal-content" className="p-4">
          <DialogHeader className="report-title-section">
            <DialogTitle className="text-3xl font-extrabold mb-4 text-center text-primary-dark">
              Reporte Oficial de Partido
            </DialogTitle>
          </DialogHeader>

          <Alert className="bg-yellow-100 border-yellow-500 text-yellow-800 mb-4 no-print">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Instrucción para Guardar como PDF</AlertTitle>
            <AlertDescription>
              Al presionar el botón de abajo, en el diálogo de impresión de tu navegador,{' '}
              <b>debes seleccionar la opción "Guardar como PDF"</b> en lugar de elegir una impresora.
            </AlertDescription>
          </Alert>

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
                <div key={team} className="bg-primary/5 p-4 rounded-xl border border-primary/20 space-y-4 incident-section">
                  <h4 className="text-xl font-extrabold text-primary-dark border-b-2 border-primary-dark pb-1">
                    {teamNames[team as Team]} ({team === 'home' ? 'LOCAL' : 'VISITANTE'})
                  </h4>
                  <div dangerouslySetInnerHTML={{ __html: `<h5>⚽ Goles Anotados (${team === 'home' ? scores.home : scores.away})</h5>${generateIncidentTable(team === 'home' ? homeGoals : awayGoals)}` }} />
                  <div dangerouslySetInnerHTML={{ __html: `<h5>🟨 Amonestaciones (${team === 'home' ? homeYellows.length : awayYellows.length})</h5>${generateIncidentTable(team === 'home' ? homeYellows : awayYellows)}` }} />
                  <div dangerouslySetInnerHTML={{ __html: `<h5>🟥 Expulsiones (${team === 'home' ? homeReds.length : awayReds.length})</h5>${generateIncidentTable(team === 'home' ? homeReds : awayReds)}` }} />
                </div>
              ))}
            </div>

            <div className='incident-section'>
              <h3 className="text-2xl font-bold text-gray-700 mb-4 border-b pb-2">Anotaciones del Juez y Correcciones</h3>
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

        <DialogFooter className="mt-4 no-print border-t pt-4">
          <Button variant="outline" onClick={handleClose}>
            Cerrar
          </Button>
          <Button onClick={handlePrint} className="bg-indigo-600 hover:bg-indigo-700">
            💾 Guardar/Imprimir Informe (PDF)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReportModal;
