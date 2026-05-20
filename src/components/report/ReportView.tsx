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

  const getPlayerEventIcons = (side: 'home' | 'away', number: string) => {
    const playerEvs = safeEvents.filter(e => e.side === side && e.playerNumber === number);
    const goalsCount = playerEvs.filter(e => e.category === 'goals').length;
    const yellowCount = playerEvs.filter(e => e.category === 'cards' && e.message.includes('🟨')).length;
    const redCount = playerEvs.filter(e => e.category === 'cards' && e.message.includes('🟥')).length;
    
    let icons = '';
    if (goalsCount > 0) icons += `    ⚽${goalsCount}`;
    if (yellowCount > 0) icons += '   🟨';
    if (redCount > 0) icons += '   🟥';
    return icons;
  };

  const renderPlayerBlock = (side: 'home' | 'away', players: Player[], x: number, y: number, title: string) => (
    <g transform={`translate(${x}, ${y})`}>
      <text x="0" y="-10" fontSize="12" fontWeight="900" fill="white" opacity="0.6" textAnchor="start">{title}</text>
      {players.map((p, i) => (
        <text key={p.id} x="0" y={15 + (i * 18)} fontSize="11" fill="white" fontWeight="700" className="uppercase">
          {`#${p.number} ${p.name.toUpperCase()}${getPlayerEventIcons(side, p.number)}`}
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
            <text textAnchor="middle" fill="white" fontSize="24" fontWeight="900" style={{ letterSpacing: '0.1em' }} className="uppercase">
              {matchInfo.league?.toUpperCase() || 'LIGA PROFESIONAL'}
            </text>
            <text y="25" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="14" fontWeight="700" className="uppercase">
              {`JORNADA ${matchInfo.round?.toUpperCase() || 'S/N'} | ${matchInfo.date || ''}`}
            </text>
            <text y="45" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="14" fontWeight="700" className="uppercase">
              {matchInfo.place?.toUpperCase() || 'CAMPO POR DEFINIR'}
            </text>
            
            <g transform="translate(0, 85)">
              <text textAnchor="middle" fill="white" fontSize="12" fontWeight="800">CUERPO ARBITRAL:</text>
              <text y="18" textAnchor="middle" fill="white" fontSize="11" fontWeight="400" className="uppercase">CENTRAL: {matchInfo.referee?.toUpperCase() || '---'}</text>
              <text y="34" textAnchor="middle" fill="white" fontSize="11" fontWeight="400" className="uppercase">A1: {matchInfo.assistant1?.toUpperCase() || '---'} | A2: {matchInfo.assistant2?.toUpperCase() || '---'}</text>
            </g>
          </g>

          <g transform="translate(200, 300)">
             <text textAnchor="middle" fill="white" fontSize="36" fontWeight="900" style={{ letterSpacing: '-0.02em' }} className="uppercase">{teamNames.home.toUpperCase()}</text>
             <text y="100" textAnchor="middle" fill="white" fontSize="130" fontWeight="900">{scores.home}</text>
             <text y="140" textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="20" fontWeight="800">{`(${numberToSpanishWords(scores.home)})`}</text>
          </g>

          <g transform="translate(600, 300)">
             <text textAnchor="middle" fill="white" fontSize="36" fontWeight="900" style={{ letterSpacing: '-0.02em' }} className="uppercase">{teamNames.away.toUpperCase()}</text>
             <text y="100" textAnchor="middle" fill="white" fontSize="130" fontWeight="900">{scores.away}</text>
             <text y="140" textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="20" fontWeight="800">{`(${numberToSpanishWords(scores.away)})`}</text>
          </g>

          <g transform="translate(40, 480)">
             <text x="0" y="0" fontSize="18" fontWeight="900" fill="white" textAnchor="start">ALINEACIONES</text>
             <g transform="translate(0, 20)">
               {renderPlayerBlock('home', homeStarters, 0, 30, 'TITULARES')}
               {renderPlayerBlock('home', homeSubs, 0, 260, 'SUPLENTES')}
             </g>
          </g>
          <g transform="translate(440, 480)">
             <text x="0" y="0" fontSize="18" fontWeight="900" fill="white" textAnchor="start">ALINEACIONES</text>
             <g transform="translate(0, 20)">
               {renderPlayerBlock('away', awayStarters, 0, 30, 'TITULARES')}
               {renderPlayerBlock('away', awaySubs, 0, 260, 'SUPLENTES')}
             </g>
          </g>

          <g transform={`translate(0, ${520 + playersSecHeight})`}>
            <rect width="800" height={cardsSecHeight} fill="rgba(0,0,0,0.2)" />
            <g transform="translate(40, 40)">
              <text fontSize="14" fontWeight="900" fill="white" textAnchor="start" className="uppercase">SANCIONES {teamNames.home}</text>
              <text y="25" fill="white" fontSize="10" fontWeight="800" opacity="0.6">AMONESTACIONES (🟨):</text>
              {homeSanciones.yellows.map((e, idx) => (
                <text key={e.id} y={45 + (idx * 20)} x="0" fill="white" fontSize="11" opacity="0.9" className="uppercase">
                   #{e.playerNumber} {e.playerName?.toUpperCase()} {e.time !== '--' ? `(${e.time})` : ''} - {e.message.split(' - ').pop()?.toUpperCase()}
                </text>
              ))}
              <g transform={`translate(0, ${40 + homeSanciones.yellows.length * 20})`}>
                <text y="25" fill="white" fontSize="10" fontWeight="800" opacity="0.6">EXPULSIONES (🟥):</text>
                {homeSanciones.reds.map((e, idx) => (
                  <text key={e.id} y={45 + (idx * 20)} x="0" fill="white" fontSize="11" opacity="0.9" className="uppercase">
                    #{e.playerNumber} {e.playerName?.toUpperCase()} {e.time !== '--' ? `(${e.time})` : ''} - {e.message.split(' - ').pop()?.toUpperCase()}
                  </text>
                ))}
              </g>
            </g>
            <g transform="translate(440, 40)">
              <text fontSize="14" fontWeight="900" fill="white" textAnchor="start" className="uppercase">SANCIONES {teamNames.away}</text>
              <text y="25" fill="white" fontSize="10" fontWeight="800" opacity="0.6">AMONESTACIONES (🟨):</text>
              {awaySanciones.yellows.map((e, idx) => (
                <text key={e.id} y={45 + (idx * 20)} x="0" fill="white" fontSize="11" opacity="0.9" className="uppercase">
                   #{e.playerNumber} {e.playerName?.toUpperCase()} {e.time !== '--' ? `(${e.time})` : ''} - {e.message.split(' - ').pop()?.toUpperCase()}
                </text>
              ))}
              <g transform={`translate(0, ${40 + awaySanciones.yellows.length * 20})`}>
                <text y="25" fill="white" fontSize="10" fontWeight="800" opacity="0.6">EXPULSIONES (🟥):</text>
                {awaySanciones.reds.map((e, idx) => (
                  <text key={e.id} y={45 + (idx * 20)} x="0" fill="white" fontSize="11" opacity="0.9" className="uppercase">
                    #{e.playerNumber} {e.playerName?.toUpperCase()} {e.time !== '--' ? `(${e.time})` : ''} - {e.message.split(' - ').pop()?.toUpperCase()}
                  </text>
                ))}
              </g>
            </g>
          </g>

          <g transform={`translate(400, ${520 + playersSecHeight + cardsSecHeight + 50})`}>
             <text textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="16" fontWeight="900">INCIDENTES DEL PARTIDO</text>
             <foreignObject x="-350" y="20" width="700" height="200">
                <div xmlns="http://www.w3.org/1999/xhtml" style={{ color: 'white', fontSize: '13px', textAlign: 'center', lineHeight: '1.4', opacity: 0.9, textTransform: 'uppercase' }}>
                  {incidents}
                </div>
             </foreignObject>
          </g>

          <g transform={`translate(0, ${svgHeight - 160})`}>
            <g transform="translate(150, 0)">
              {signatures.captainHome && <image href={signatures.captainHome} x="-70" y="-80" width="140" height="70" />}
              <line x1="-100" x2="100" y1="0" y2="0" stroke="white" strokeWidth="1.5" opacity="0.5" />
              <text y="20" textAnchor="middle" fill="white" fontSize="11" fontWeight="900">CAPITÁN / DELEGADO LOCAL</text>
            </g>

            <g transform="translate(400, 0)">
              {signatures.referee && <image href={signatures.referee} x="-70" y="-80" width="140" height="70" />}
              <line x1="-100" x2="100" y1="0" y2="0" stroke="white" strokeWidth="1.5" opacity="0.5" />
              <text y="20" textAnchor="middle" fill="white" fontSize="11" fontWeight="900">ÁRBITRO CENTRAL</text>
            </g>

            <g transform="translate(650, 0)">
              {signatures.captainAway && <image href={signatures.captainAway} x="-70" y="-80" width="140" height="70" />}
              <line x1="-100" x2="100" y1="0" y2="0" stroke="white" strokeWidth="1.5" opacity="0.5" />
              <text y="20" textAnchor="middle" fill="white" fontSize="11" fontWeight="900">CAPITÁN / DELEGADO VISITANTE</text>
            </g>
          </g>

          <text x="400" y={svgHeight - 30} textAnchor="middle" fill="white" opacity="0.4" fontSize="11" fontWeight="900" style={{ letterSpacing: '0.3em' }}>
            CEDULA DIGITAL GENERADA POR REFEREE ELITE
          </text>
        </svg>
      </div>

      <div className="flex justify-center gap-3 mt-8">
        <Button onClick={handleDownload} className="bg-emerald-600 hover:bg-emerald-700 font-bold px-10 h-12">
          <Download className="mr-2 h-5 w-5" /> DESCARGAR IMAGEN JPG
        </Button>
        <DialogClose asChild>
          <Button variant="outline" className="text-white border-white/20 hover:bg-white/10 h-12">
            CERRAR VISTA PREVIA
          </Button>
        </DialogClose>
      </div>
    </div>
  );
}
