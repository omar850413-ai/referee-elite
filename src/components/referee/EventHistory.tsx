'use client';

import type { GameEvent, TeamNames } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

type EventHistoryProps = {
  events: GameEvent[];
  teamNames: TeamNames;
};

const EventHistory = ({ events, teamNames }: EventHistoryProps) => {
  const sortedEvents = [...events].sort((a, b) => a.time - b.time);

  const getEventContent = (event: GameEvent) => {
    const timeFormatted = formatTime(event.time);
    const teamName = event.team ? teamNames[event.team] : '';
    const teamClass = event.team === 'home' ? 'text-primary' : 'text-secondary';
    let icon = '';
    let content = '';
    let baseClass = 'p-3 rounded-lg flex justify-between items-center text-sm font-semibold transition duration-150 ease-in-out';
    let styleClass = '';

    const formatJersey = (jersey: number | string) => {
      if (typeof jersey === 'string') {
        return `<strong>${jersey}</strong>`;
      }
      return `Camiseta <strong>#${jersey}</strong>`;
    };

    switch (event.type) {
      case 'period_start':
        icon = '▶️';
        content = `<span class="font-bold">${event.text.toUpperCase()}</span>`;
        styleClass = 'bg-green-500/10 border-l-4 border-green-500 text-green-300';
        break;
      case 'period_end':
        icon = '🏁';
        content = `<span class="font-bold">${event.text.toUpperCase()}</span>`;
        styleClass = 'bg-red-500/10 border-l-4 border-red-500 text-red-300';
        break;
      case 'goal':
        icon = '⚽';
        content = `<span class="${teamClass}">${teamName}</span>: Gol de Camiseta <strong>#${event.jersey}</strong>`;
        styleClass = 'bg-green-500/10 border-l-4 border-green-500';
        break;
      case 'goal_removed':
        icon = '➖';
        content = `<span class="${teamClass}">${teamName}</span>: <strong>GOL CORREGIDO</strong> de Camiseta <strong>#${event.jersey}</strong>.`;
        styleClass = 'bg-purple-500/20 border-l-4 border-purple-500';
        break;
      case 'foul':
        icon = '🚨';
        content = `<span class="text-muted-foreground">${teamName}</span>: Falta cometida.`;
        styleClass = 'bg-muted/30 border-l-4 border-muted-foreground';
        break;
      case 'yellow':
        icon = '🟨';
        content = `<span class="${teamClass}">${teamName}</span>: Amonestación a ${formatJersey(event.jersey)} por: <em>${event.reason}</em>`;
        styleClass = 'bg-yellow-400/30 border-l-4 border-yellow-500';
        break;
      case 'red':
        icon = '🟥';
        content = `<span class="${teamClass}">${teamName}</span>: Expulsión a ${formatJersey(event.jersey)}. Causa: <em>${event.reason}</em>`;
        styleClass = 'bg-red-500/30 border-l-4 border-red-500';
        break;
      case 'note':
        icon = '📝';
        content = `ANOTACIÓN: <em>${event.text}</em>`;
        styleClass = 'bg-accent/10 border-l-4 border-accent';
        break;
      case 'substitution':
        icon = '🔄';
        content = `<span class="${teamClass}">${teamName}</span>: Sale <strong>#${event.playerOut}</strong>, entra <strong>#${event.playerIn}</strong>`;
        styleClass = 'bg-primary/10 border-l-4 border-primary';
        break;
    }

    if (event.type === 'period_start' || event.type === 'period_end') {
       return (
        <li className={cn(baseClass, styleClass, 'justify-center')}>
          <span className="flex items-center justify-center w-full" dangerouslySetInnerHTML={{ __html: `${icon} ${content} <span class="text-muted-foreground font-mono ml-3">T: ${timeFormatted}</span>` }} />
        </li>
      );
    }
    
    return (
      <li className={cn(baseClass, styleClass)}>
        <div className="flex items-center space-x-2">
          <span>{icon}</span>
          <span dangerouslySetInnerHTML={{ __html: content }} />
        </div>
        <span className="text-muted-foreground font-mono">{timeFormatted}</span>
      </li>
    );
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-foreground/80 border-b pb-2">
          Historial de Incidencias
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-80 w-full">
          <ul className="space-y-2 pr-4">
            {sortedEvents.length > 0 ? (
              sortedEvents.map((event, index) => <div key={index}>{getEventContent(event)}</div>)
            ) : (
              <li className="text-muted-foreground italic text-center p-4">
                No hay eventos registrados.
              </li>
            )}
          </ul>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default EventHistory;
