
'use client';

import React, { useRef } from 'react';
import { MatchState, MatchEvent, Player } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import { DialogClose, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { numberToSpanishWords } from '@/lib/utils';

interface ReportViewProps {
  matchState: MatchState;
}

export function ReportView({ matchState }: ReportViewProps) {
  const { scores, teamNames, matchInfo, events, lineups = { home: [], away: [] }, signatures = {} } = matchState;
  const svgRef = useRef<SVGSVGElement>(null);

  const handleDownload = () => {
    if (!svgRef.current) return;

    const svg = svgRef.current;
    const style = document.createElement('style');
    style.innerHTML = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
    svg { font-family: 'Inter', sans-serif; }`;
    svg.insertBefore(style, svg.firstChild);
    
    const svgHeight = parseFloat(svg.getAttribute('height') || '1800');
    const svgData = new XMLSerializer().serializeToString(svg);
    svg.removeChild(style);

    const canvas = document.createElement('canvas');
    const scale = 2;
    canvas.width = 800 * scale;
    canvas.height = svgHeight * scale;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    const img = new Image();
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));

    img.onload = () => {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const jpegUrl = canvas.toDataURL('image/jpeg', 0.95);
      const link = document.createElement('a');
      link.href = jpegUrl;
      link.download = `cedula-imagen-${matchInfo.league || 'partido'}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };
  };

  const safeEvents = events || [];
  const homePlayers = lineups.home || [];
  const awayPlayers = lineups.away || [];

  const homeStarters = homePlayers.slice(0, 11);
  const homeSubs = homePlayers.slice(11);
  const awayStarters = awayPlayers.slice(0, 11);
  const awaySubs = awayPlayers.slice(11);

  const getSanciones = (side: 'home' | 'away') => {
    const sideCards = safeEvents.filter(e => e.side === side && e.category === 'cards');
    const yellows = sideCards.filter(e => e.message.includes('🟨'));
    const reds = sideCards.filter(e => e.message.includes('🟥'));
    return { yellows, reds };
  };

  const homeSanciones = getSanciones('home');
  const awaySanciones = getSanciones('away');

  const incidents = safeEvents.find(e => e.category === 'notes')?.message.replace('📝 ', '') || 'SIN INCIDENTES REPORTADOS.';

  const getPlayerEventsSummary = (side: 'home' | 'away', number: string, isSub: boolean, replacedNumber?: string) => {
    const playerEvs = safeEvents.filter(e => e.side === side && e.playerNumber === number);
    const goals = playerEvs.filter(e => e.category === 'goals');
    const yellows = playerEvs.filter(e => e.category === 'cards' && e.message.includes('🟨'));
    const reds = playerEvs.filter(e => e.category === 'cards' && e.message.includes('🟥'));
    const subEv = playerEvs.find(e => e.category === 'substitution');
    
    let summary = '';
    yellows.forEach(e => { summary += ` 🟨${e.time !== '--' ? `(${e.time})` : ''}`; });
    reds.forEach(e => { summary += ` 🟥${e.time !== '--' ? `(${e.time})` : ''}`; });
    goals.forEach(e => { 
      const icon = e.message.includes('AUTOGOL') ? '🥅' : '⚽';
      summary += ` ${icon}${e.time !== '--' ? `(${e.time})` : ''}`; 
    });
    
    if (isSub && replacedNumber) {
      summary += ` (SALIÓ: #${replacedNumber}${subEv?.time !== '--' ? ` ${subEv?.time}` : ''})`;
    }
    
    return summary;
  };

  const renderPlayerBlock = (side: 'home' | 'away', players: Player[], x: number, y: number, title: string, isSub: boolean) => (
    <g transform={`translate(${x}, ${y})`}>
      <text x="0" y="-10" fontSize="12" fontWeight="900" fill="white" opacity="0.6" textAnchor="start">{title.toUpperCase()}</text>
      {players.map((p, i) => (
        <text key={p.id} x="0" y={15 + (i * 18)} fontSize="10" fill="white" fontWeight="700" className="uppercase">
          {`#${p.number} ${p.name.toUpperCase()}${getPlayerEventsSummary(side, p.number, isSub, p.replacedNumber)}`}
        </text>
      ))}
    </g>
  );

  const homeColor = '#064E3B'; 
  const awayColor = '#1E3A8A'; 
  
  const maxPlayersCount = Math.max(homePlayers.length, awayPlayers.length);
  const playersSecHeight = (maxPlayersCount * 18) + 120;
  
  const homeCardsCount = homeSanciones.yellows.length + homeSanciones.reds.length + 2; 
  const awayCardsCount = awaySanciones.yellows.length + awaySanciones.reds.length + 2;
  const cardsSecHeight = (Math.max(homeCardsCount, awayCardsCount) * 22) + 120;
  
  const svgHeight = 480 + playersSecHeight + cardsSecHeight + 400;

  return (
    <div className="w-full max-h-[90vh] overflow-y-auto p-4 bg-slate-900 rounded-xl">
      <DialogHeader className="px-2 pb-4 text-left">
        <DialogTitle className="text-white font-black italic uppercase">Cédula Digital Profesional</DialogTitle>
        <DialogDescription className="text-slate-400">
          Informe en formato JPG de alta resolución generado por Referee Elite.
        </DialogDescription>
      </DialogHeader>
      
      <div className="relative w-full max-w-[800px] mx-auto border-4 border-white/10 rounded-lg overflow-hidden">
        <svg
          ref={svgRef}
          viewBox={`0 0 800 ${svgHeight}`}
          width="800"
          height={svgHeight}
          xmlns="http://www.w3.org/2000/svg"
          className="max-w-full h-auto bg-white"
        >
          <rect x="0" y="0" width="400" height={svgHeight} fill={homeColor} />
          <rect x="400" y="0" width="400" height={svgHeight} fill={awayColor} />

          <rect x="0" y="0" width="800" height="200" fill="rgba(0,0,0,0.3)" />
          <g transform="translate(400, 50)">
            <text textAnchor="middle" fill="white" fontSize="30" fontWeight="900" style={{ letterSpacing: '0.1em' }} className="uppercase">
              INFORME ARBITRAL
            </text>
            <text y="30" textAnchor="middle" fill="white" fontSize="18" fontWeight="800" className="uppercase">
              {matchInfo.league?.toUpperCase() || 'LIGA'}
            </text>
            <text y="50" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="14" fontWeight="700" className="uppercase">
              {`JORNADA ${matchInfo.round?.toUpperCase() || 'S/N'} | ${matchInfo.date || ''}`}
            </text>
          </g>

          <g transform="translate(200, 300)">
             <text textAnchor="middle" fill="white" fontSize="36" fontWeight="900" className="uppercase">{teamNames.home.toUpperCase()}</text>
             <text y="100" textAnchor="middle" fill="white" fontSize="130" fontWeight="900">{scores.home}</text>
             <text y="140" textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="20" fontWeight="800">{`(${numberToSpanishWords(scores.home)})`}</text>
          </g>

          <g transform="translate(600, 300)">
             <text textAnchor="middle" fill="white" fontSize="36" fontWeight="900" className="uppercase">{teamNames.away.toUpperCase()}</text>
             <text y="100" textAnchor="middle" fill="white" fontSize="130" fontWeight="900">{scores.away}</text>
             <text y="140" textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="20" fontWeight="800">{`(${numberToSpanishWords(scores.away)})`}</text>
          </g>

          <g transform="translate(40, 480)">
             <text x="0" y="0" fontSize="18" fontWeight="900" fill="white" textAnchor="start">ALINEACIONES</text>
             <g transform="translate(0, 20)">
               {renderPlayerBlock('home', homeStarters, 0, 30, 'TITULARES', false)}
               {renderPlayerBlock('home', homeSubs, 0, 260, 'SUPLENTES / CAMBIOS', true)}
             </g>
          </g>
          <g transform="translate(440, 480)">
             <text x="0" y="0" fontSize="18" fontWeight="900" fill="white" textAnchor="start">ALINEACIONES</text>
             <g transform="translate(0, 20)">
               {renderPlayerBlock('away', awayStarters, 0, 30, 'TITULARES', false)}
               {renderPlayerBlock('away', awaySubs, 0, 260, 'SUPLENTES / CAMBIOS', true)}
             </g>
          </g>

          <g transform={`translate(0, ${520 + playersSecHeight})`}>
            <rect width="800" height={cardsSecHeight} fill="rgba(0,0,0,0.2)" />
            <g transform="translate(40, 40)">
              <text fontSize="14" fontWeight="900" fill="white" textAnchor="start" className="uppercase">SANCIONES {teamNames.home.toUpperCase()}</text>
              <g transform="translate(0, 30)">
                {homeSanciones.yellows.map((e, idx) => (
                  <text key={e.id} y={idx * 20} x="0" fill="white" fontSize="10" opacity="0.9" className="uppercase">
                     🟨 #{e.playerNumber} {e.playerName?.toUpperCase()} {e.time !== '--' ? `(${e.time})` : ''} - {e.message.split(' - ').pop()?.toUpperCase()}
                  </text>
                ))}
              </g>
              <g transform={`translate(0, ${50 + homeSanciones.yellows.length * 20})`}>
                {homeSanciones.reds.map((e, idx) => (
                  <text key={e.id} y={idx * 20} x="0" fill="white" fontSize="10" opacity="0.9" className="uppercase">
                    🟥 #{e.playerNumber} {e.playerName?.toUpperCase()} {e.time !== '--' ? `(${e.time})` : ''} - {e.message.split(' - ').pop()?.toUpperCase()}
                  </text>
                ))}
              </g>
            </g>
            <g transform="translate(440, 40)">
              <text fontSize="14" fontWeight="900" fill="white" textAnchor="start" className="uppercase">SANCIONES {teamNames.away.toUpperCase()}</text>
              <g transform="translate(0, 30)">
                {awaySanciones.yellows.map((e, idx) => (
                  <text key={e.id} y={idx * 20} x="0" fill="white" fontSize="10" opacity="0.9" className="uppercase">
                     🟨 #{e.playerNumber} {e.playerName?.toUpperCase()} {e.time !== '--' ? `(${e.time})` : ''} - {e.message.split(' - ').pop()?.toUpperCase()}
                  </text>
                ))}
              </g>
              <g transform={`translate(0, ${50 + awaySanciones.yellows.length * 20})`}>
                {awaySanciones.reds.map((e, idx) => (
                  <text key={e.id} y={idx * 20} x="0" fill="white" fontSize="10" opacity="0.9" className="uppercase">
                    🟥 #{e.playerNumber} {e.playerName?.toUpperCase()} {e.time !== '--' ? `(${e.time})` : ''} - {e.message.split(' - ').pop()?.toUpperCase()}
                  </text>
                ))}
              </g>
            </g>
          </g>

          <g transform={`translate(400, ${520 + playersSecHeight + cardsSecHeight + 50})`}>
             <text textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="16" fontWeight="900" className="uppercase">INCIDENTES DEL PARTIDO</text>
             <foreignObject x="-350" y="20" width="700" height="200">
                <div xmlns="http://www.w3.org/1999/xhtml" style={{ color: 'white', fontSize: '12px', textAlign: 'center', lineHeight: '1.3', opacity: 0.9, textTransform: 'uppercase' }}>
                  {incidents.toUpperCase()}
                </div>
             </foreignObject>
          </g>

          <g transform={`translate(0, ${svgHeight - 140})`}>
            <g transform="translate(150, 0)">
              {signatures.captainHome && <image href={signatures.captainHome} x="-60" y="-70" width="120" height="60" />}
              <line x1="-80" x2="80" y1="0" y2="0" stroke="white" strokeWidth="1" opacity="0.5" />
              <text y="15" textAnchor="middle" fill="white" fontSize="9" fontWeight="900">CAPITÁN LOCAL</text>
            </g>

            <g transform="translate(400, 0)">
              {signatures.referee && <image href={signatures.referee} x="-60" y="-70" width="120" height="60" />}
              <line x1="-80" x2="80" y1="0" y2="0" stroke="white" strokeWidth="1" opacity="0.5" />
              <text y="15" textAnchor="middle" fill="white" fontSize="9" fontWeight="900">ÁRBITRO CENTRAL</text>
            </g>

            <g transform="translate(650, 0)">
              {signatures.captainAway && <image href={signatures.captainAway} x="-60" y="-70" width="120" height="60" />}
              <line x1="-80" x2="80" y1="0" y2="0" stroke="white" strokeWidth="1" opacity="0.5" />
              <text y="15" textAnchor="middle" fill="white" fontSize="9" fontWeight="900">CAPITÁN VISITANTE</text>
            </g>
          </g>
        </svg>
      </div>

      <div className="flex justify-center gap-3 mt-8">
        <Button onClick={handleDownload} className="bg-emerald-600 hover:bg-emerald-700 font-bold px-10 h-12 uppercase">
          <Download className="mr-2 h-5 w-5" /> DESCARGAR IMAGEN JPG
        </Button>
        <DialogClose asChild>
          <Button variant="outline" className="text-white border-white/20 hover:bg-white/10 h-12 uppercase">
            CERRAR VISTA PREVIA
          </Button>
        </DialogClose>
      </div>
    </div>
  );
}
