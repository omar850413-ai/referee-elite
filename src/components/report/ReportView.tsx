'use client';

import React, { useRef } from 'react';
import { MatchState, MatchEvent, Player, StaffMember } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import { DialogClose } from '@/components/ui/dialog';
import { numberToSpanishWords } from '@/lib/utils';

interface ReportViewProps {
  matchState: MatchState;
}

export function ReportView({ matchState }: ReportViewProps) {
  const { scores, teamNames, matchInfo, events, lineups = { home: [], away: [] }, staff = { home: [], away: [] }, signatures = {} } = matchState;
  const svgRef = useRef<SVGSVGElement>(null);

  const handleDownload = () => {
    if (!svgRef.current) return;

    const svg = svgRef.current;
    const style = document.createElement('style');
    style.innerHTML = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
    svg { font-family: 'Inter', sans-serif; }`;
    svg.insertBefore(style, svg.firstChild);
    
    const svgWidth = 800;
    const svgHeight = parseFloat(svg.getAttribute('height') || '1800');
    const svgData = new XMLSerializer().serializeToString(svg);
    svg.removeChild(style);

    const canvas = document.createElement('canvas');
    const scale = 2;
    canvas.width = svgWidth * scale;
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
      const fileName = `${teamNames.home || 'LOCAL'}-VS-${teamNames.away || 'VISITA'}.jpg`.toUpperCase();
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };
  };

  const safeEvents = events || [];
  const homePlayers = lineups.home || [];
  const awayPlayers = lineups.away || [];
  const homeStaff = staff.home || [];
  const awayStaff = staff.away || [];

  const getSanciones = (side: 'home' | 'away') => {
    const sideCards = safeEvents.filter(e => e.side === side && e.category === 'cards');
    const yellows = sideCards.filter(e => e.message.includes('🟨'));
    const reds = sideCards.filter(e => e.message.includes('🟥'));
    return { yellows, reds };
  };

  const homeSanciones = getSanciones('home');
  const awaySanciones = getSanciones('away');

  const incidents = safeEvents.find(e => e.category === 'notes')?.message.replace('📝 ', '') || 'SIN INCIDENTES REPORTADOS.';

  const getPlayerEventsSummary = (side: 'home' | 'away', number: string, isSub: boolean, p?: Player) => {
    const playerEvs = safeEvents.filter(e => e.side === side && e.playerNumber === number);
    const goals = playerEvs.filter(e => e.category === 'goals');
    const yellows = playerEvs.filter(e => e.category === 'cards' && e.message.includes('🟨'));
    const reds = playerEvs.filter(e => e.category === 'cards' && e.message.includes('🟥'));
    const subEv = playerEvs.find(e => e.category === 'substitution');
    
    let summary = '';
    goals.forEach(e => { 
      const icon = e.message.includes('AUTOGOL') ? '🥅' : '⚽';
      summary += ` ${icon}${e.time !== '--' && e.time !== '' ? ` (${e.time})` : ''}`; 
    });
    yellows.forEach(e => { summary += ` 🟨${e.time !== '--' && e.time !== '' ? ` (${e.time})` : ''}`; });
    reds.forEach(e => { summary += ` 🟥${e.time !== '--' && e.time !== '' ? ` (${e.time})` : ''}`; });
    
    if (isSub && p?.replacedNumber) {
      summary += ` (POR: #${p.replacedNumber}${subEv?.time !== '--' && subEv?.time !== '' ? ` ${subEv?.time}` : ''})`;
    }
    
    return summary;
  };

  const getStaffEventsSummary = (side: 'home' | 'away', name: string) => {
    const staffEvs = safeEvents.filter(e => e.side === side && e.playerName === name);
    const yellows = staffEvs.filter(e => e.category === 'cards' && e.message.includes('🟨'));
    const reds = staffEvs.filter(e => e.category === 'cards' && e.message.includes('🟥'));
    
    let summary = '';
    yellows.forEach(e => { summary += ` 🟨${e.time !== '--' && e.time !== '' ? ` (${e.time})` : ''}`; });
    reds.forEach(e => { summary += ` 🟥${e.time !== '--' && e.time !== '' ? ` (${e.time})` : ''}`; });
    
    return summary;
  };

  const ROW_HEIGHT = 18;
  const SECTION_SPACING = 40;
  
  const homeRows = homePlayers.length + homeStaff.length;
  const awayRows = awayPlayers.length + awayStaff.length;
  const lineupsHeight = Math.max(homeRows, awayRows) * ROW_HEIGHT + (SECTION_SPACING * 3);
  
  const homeSancionesRows = homeSanciones.yellows.length + homeSanciones.reds.length;
  const awaySancionesRows = awaySanciones.yellows.length + awaySanciones.reds.length;
  const sancionesHeight = Math.max(homeSancionesRows, awaySancionesRows) * 22 + (SECTION_SPACING * 2);
  
  const incidentRows = Math.ceil(incidents.length / 80); 
  const incidentsHeight = Math.max(100, incidentRows * 16 + 50);
  
  const totalHeight = 500 + lineupsHeight + sancionesHeight + incidentsHeight + 200;

  const homeColor = '#064E3B'; 
  const awayColor = '#1E3A8A'; 

  return (
    <div className="w-full max-h-[95vh] overflow-y-auto p-4 bg-slate-900 rounded-xl relative">
      <div className="px-2 pb-4 text-left flex justify-between items-center">
        <div>
          <h2 className="text-white font-black italic uppercase">Cédula Digital Profesional</h2>
          <p className="text-slate-400 text-sm">Alta resolución dinámica.</p>
        </div>
        <DialogClose className="text-white hover:bg-white/10 p-2 rounded-full">
           <X size={24} />
        </DialogClose>
      </div>
      
      <div className="relative w-full max-w-[800px] mx-auto border-4 border-white/10 rounded-lg overflow-hidden bg-white shadow-2xl">
        <svg
          ref={svgRef}
          viewBox={`0 0 800 ${totalHeight}`}
          width="800"
          height={totalHeight}
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect x="0" y="0" width="400" height={totalHeight} fill={homeColor} />
          <rect x="400" y="0" width="400" height={totalHeight} fill={awayColor} />

          <rect x="0" y="0" width="800" height="200" fill="rgba(0,0,0,0.3)" />
          <g transform="translate(400, 50)">
            <text textAnchor="middle" fill="white" fontSize="32" fontWeight="900" style={{ letterSpacing: '0.1em' }} className="uppercase">INFORME ARBITRAL</text>
            <text y="35" textAnchor="middle" fill="white" fontSize="18" fontWeight="800" className="uppercase">{matchInfo.league || 'LIGA'}</text>
            <text y="60" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="14" fontWeight="700" className="uppercase">{`JORNADA ${matchInfo.round || 'S/N'} | ${matchInfo.date || ''}`}</text>
          </g>

          <g transform="translate(200, 300)">
             <text textAnchor="middle" fill="white" fontSize="36" fontWeight="900" className="uppercase">{teamNames.home}</text>
             <text y="100" textAnchor="middle" fill="white" fontSize="130" fontWeight="900">{scores.home}</text>
             <text y="140" textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="20" fontWeight="800">{`(${numberToSpanishWords(scores.home)})`}</text>
          </g>
          <g transform="translate(600, 300)">
             <text textAnchor="middle" fill="white" fontSize="36" fontWeight="900" className="uppercase">{teamNames.away}</text>
             <text y="100" textAnchor="middle" fill="white" fontSize="130" fontWeight="900">{scores.away}</text>
             <text y="140" textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="20" fontWeight="800">{`(${numberToSpanishWords(scores.away)})`}</text>
          </g>

          <g transform="translate(40, 480)">
             <text x="0" y="0" fontSize="18" fontWeight="900" fill="white" textAnchor="start" className="uppercase">Alineaciones {teamNames.home}</text>
             <g transform="translate(0, 30)">
               <text x="0" y="-10" fontSize="10" fontWeight="900" fill="white" opacity="0.6" className="uppercase">TITULARES</text>
               {homePlayers.slice(0, 11).map((p, i) => (
                 <text key={p.id} y={15 + i * ROW_HEIGHT} fontSize="10" fill="white" fontWeight="700" className="uppercase">
                   {`#${p.number} ${p.name}${getPlayerEventsSummary('home', p.number, false, p)}`}
                 </text>
               ))}
               <g transform={`translate(0, ${11 * ROW_HEIGHT + 25})`}>
                 <text x="0" y="-10" fontSize="10" fontWeight="900" fill="white" opacity="0.6" className="uppercase">SUPLENTES / CAMBIOS</text>
                 {homePlayers.slice(11).map((p, i) => (
                   <text key={p.id} y={15 + i * ROW_HEIGHT} fontSize="10" fill="white" fontWeight="700" className="uppercase">
                     {`#${p.number} ${p.name}${getPlayerEventsSummary('home', p.number, true, p)}`}
                   </text>
                 ))}
                 <g transform={`translate(0, ${Math.max(0, homePlayers.length - 11) * ROW_HEIGHT + 25})`}>
                   <text x="0" y="-10" fontSize="10" fontWeight="900" fill="white" opacity="0.6" className="uppercase">CUERPO TÉCNICO</text>
                   {homeStaff.map((s, i) => (
                     <text key={s.id} y={15 + i * ROW_HEIGHT} fontSize="10" fill="white" fontWeight="700" className="uppercase">
                       {`${s.role}: ${s.name}${getStaffEventsSummary('home', s.name)}`}
                     </text>
                   ))}
                 </g>
               </g>
             </g>
          </g>

          <g transform="translate(440, 480)">
             <text x="0" y="0" fontSize="18" fontWeight="900" fill="white" textAnchor="start" className="uppercase">Alineaciones {teamNames.away}</text>
             <g transform="translate(0, 30)">
               <text x="0" y="-10" fontSize="10" fontWeight="900" fill="white" opacity="0.6" className="uppercase">TITULARES</text>
               {awayPlayers.slice(0, 11).map((p, i) => (
                 <text key={p.id} y={15 + i * ROW_HEIGHT} fontSize="10" fill="white" fontWeight="700" className="uppercase">
                   {`#${p.number} ${p.name}${getPlayerEventsSummary('away', p.number, false, p)}`}
                 </text>
               ))}
               <g transform={`translate(0, ${11 * ROW_HEIGHT + 25})`}>
                 <text x="0" y="-10" fontSize="10" fontWeight="900" fill="white" opacity="0.6" className="uppercase">SUPLENTES / CAMBIOS</text>
                 {awayPlayers.slice(11).map((p, i) => (
                   <text key={p.id} y={15 + i * ROW_HEIGHT} fontSize="10" fill="white" fontWeight="700" className="uppercase">
                     {`#${p.number} ${p.name}${getPlayerEventsSummary('away', p.number, true, p)}`}
                   </text>
                 ))}
                 <g transform={`translate(0, ${Math.max(0, awayPlayers.length - 11) * ROW_HEIGHT + 25})`}>
                   <text x="0" y="-10" fontSize="10" fontWeight="900" fill="white" opacity="0.6" className="uppercase">CUERPO TÉCNICO</text>
                   {awayStaff.map((s, i) => (
                     <text key={s.id} y={15 + i * ROW_HEIGHT} fontSize="10" fill="white" fontWeight="700" className="uppercase">
                       {`${s.role}: ${s.name}${getStaffEventsSummary('away', s.name)}`}
                     </text>
                   ))}
                 </g>
               </g>
             </g>
          </g>

          <g transform={`translate(0, ${500 + lineupsHeight})`}>
            <rect width="800" height={sancionesHeight} fill="rgba(0,0,0,0.2)" />
            <g transform="translate(40, 40)">
              <text fontSize="12" fontWeight="900" fill="white" opacity="0.6" className="uppercase">Amonestados {teamNames.home}</text>
              <g transform="translate(0, 20)">
                {homeSanciones.yellows.map((e, idx) => (
                  <text key={e.id} y={idx * 18} x="0" fill="white" fontSize="9" fontWeight="700" className="uppercase">
                     {`${e.playerName} 🟨 ${e.message.split(' - ').pop()} ${e.time !== '--' ? `(${e.time})` : ''}`}
                  </text>
                ))}
              </g>
              <g transform={`translate(0, ${homeSanciones.yellows.length * 18 + 40})`}>
                <text fontSize="12" fontWeight="900" fill="white" opacity="0.6" className="uppercase">Expulsados {teamNames.home}</text>
                <g transform="translate(0, 20)">
                  {homeSanciones.reds.map((e, idx) => (
                    <text key={e.id} y={idx * 18} x="0" fill="white" fontSize="9" fontWeight="700" className="uppercase">
                      {`${e.playerName} 🟥 ${e.message.split(' - ').pop()} ${e.time !== '--' ? `(${e.time})` : ''}`}
                    </text>
                  ))}
                </g>
              </g>
            </g>
            <g transform="translate(440, 40)">
              <text fontSize="12" fontWeight="900" fill="white" opacity="0.6" className="uppercase">Amonestados {teamNames.away}</text>
              <g transform="translate(0, 20)">
                {awaySanciones.yellows.map((e, idx) => (
                  <text key={e.id} y={idx * 18} x="0" fill="white" fontSize="9" fontWeight="700" className="uppercase">
                     {`${e.playerName} 🟨 ${e.message.split(' - ').pop()} ${e.time !== '--' ? `(${e.time})` : ''}`}
                  </text>
                ))}
              </g>
              <g transform={`translate(0, ${awaySanciones.yellows.length * 18 + 40})`}>
                <text fontSize="12" fontWeight="900" fill="white" opacity="0.6" className="uppercase">Expulsados {teamNames.away}</text>
                <g transform="translate(0, 20)">
                  {awaySanciones.reds.map((e, idx) => (
                    <text key={e.id} y={idx * 18} x="0" fill="white" fontSize="9" fontWeight="700" className="uppercase">
                      {`${e.playerName} 🟥 ${e.message.split(' - ').pop()} ${e.time !== '--' ? `(${e.time})` : ''}`}
                    </text>
                  ))}
                </g>
              </g>
            </g>
          </g>

          <g transform={`translate(400, ${550 + lineupsHeight + sancionesHeight})`}>
             <text textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="16" fontWeight="900" className="uppercase">INCIDENTES DEL PARTIDO</text>
             <foreignObject x="-350" y="20" width="700" height={incidentsHeight}>
                <div xmlns="http://www.w3.org/1999/xhtml" style={{ color: 'white', fontSize: '11px', textAlign: 'center', lineHeight: '1.4', opacity: 0.9, textTransform: 'uppercase', whiteSpace: 'pre-wrap' }}>
                  {incidents}
                </div>
             </foreignObject>
          </g>

          <g transform={`translate(0, ${totalHeight - 120})`}>
            <g transform="translate(150, 0)">
              {signatures.captainHome && <image href={signatures.captainHome} x="-60" y="-70" width="120" height="60" />}
              <line x1="-80" x2="80" y1="0" y2="0" stroke="white" strokeWidth="1" opacity="0.5" />
              <text y="15" textAnchor="middle" fill="white" fontSize="9" fontWeight="900" className="uppercase">Capitán Local</text>
            </g>
            <g transform="translate(400, 0)">
              {signatures.referee && <image href={signatures.referee} x="-60" y="-70" width="120" height="60" />}
              <line x1="-80" x2="80" y1="0" y2="0" stroke="white" strokeWidth="1" opacity="0.5" />
              <text y="15" textAnchor="middle" fill="white" fontSize="9" fontWeight="900" className="uppercase">Árbitro Central</text>
            </g>
            <g transform="translate(650, 0)">
              {signatures.captainAway && <image href={signatures.captainAway} x="-60" y="-70" width="120" height="60" />}
              <line x1="-80" x2="80" y1="0" y2="0" stroke="white" strokeWidth="1" opacity="0.5" />
              <text y="15" textAnchor="middle" fill="white" fontSize="9" fontWeight="900" className="uppercase">Capitán Visitante</text>
            </g>
          </g>
        </svg>
      </div>

      <div className="flex justify-center gap-3 mt-8 pb-8">
        <Button onClick={handleDownload} className="bg-emerald-600 hover:bg-emerald-700 font-black px-10 h-14 uppercase shadow-xl">
          <Download className="mr-2 h-6 w-6" /> Descargar Imagen JPG
        </Button>
      </div>
    </div>
  );
}
