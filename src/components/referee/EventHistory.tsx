
'use client';

import type { MatchAction, GameEvent, GoalEvent, TeamNames, ModalType } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatTime, cn } from '@/lib/utils';
import { Edit } from 'lucide-react';

type EventHistoryProps = {
  events: GameEvent[];
  teamNames: TeamNames;
  dispatch: React.Dispatch<MatchAction>;
};

const EventHistory = ({ events, teamNames, dispatch }: EventHistoryProps) => {
  const sortedEvents = [...events].sort((a, b) => a.time - b.time);

  const handleEventClick = (event: GameEvent) => {
    let modalType: ModalType | null = null;
    let modalData: any = {};

    switch (event.type) {
      case 'goal':
        modalType = 'goal';
        modalData = { team: event.team };
        break;
      case 'goal_removed':
        // Not editable as it's a correction itself
        return;
      case 'yellow':
      case 'red':
        modalType = 'card';
        modalData = { cardType: event.type, team: event.team };
        break;
      case 'substitution':
        modalType = 'substitution';
        modalData = { team: event.team };
        break;
      case 'note':
        modalType = 'note';
        break;
      // Other events like fouls, period start/end are not editable
      default:
        return;
    }

    if (modalType) {
      dispatch({ type: 'OPEN_MODAL', payload: { type: modalType, data: modalData, eventToEdit: event } });
    }
  };

  const getEventContent = (event: GameEvent) => {
    const timeFormatted = formatTime(event.time);
    const teamName = event.team ? teamNames[event.team] : '';
    const teamClass = event.team === 'home' ? 'text-primary' : 'text-secondary';
    let icon = '';
    let content = '';
    let baseClass = 'p-3 rounded-lg flex justify-between items-center text-sm font-semibold transition duration-150 ease-in-out';
    let styleClass = '';
    const isEditable = ['goal', 'yellow', 'red', 'substitution', 'note'].includes(event.type);

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
        const goalEvent = event as GoalEvent;
        let goalText = '';
        if (goalEvent.goalType === 'penalty') {
            goalText = `Gol de Penal de Camiseta <strong>#${goalEvent.jersey}</strong>`;
        } else if (goalEvent.goalType === 'own_goal') {
            const opposingTeamName = teamNames[goalEvent.team === 'home' ? 'away' : 'home'];
            goalText = `Autogol de Camiseta <strong>#${goalEvent.jersey}</strong> (${opposingTeamName})`;
        } else {
            goalText = `Gol de Camiseta <strong>#${goalEvent.jersey}</strong>`;
        }
        content = `<span class="${teamClass}">${teamName}</span>: ${goalText}`;
        styleClass = 'bg-green-500/10 border-l-4 border-green-500';
        break;
      case 'goal_removed':
        icon = '➖';
        content = `<span class="${teamClass}">${teamName}</span>: <strong>GOL ANULADO</strong> de Camiseta <strong>#${event.jersey}</strong>.`;
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
    
    const eventBody = (
      <>
        <div className="flex items-center space-x-2 text-left">
          <span>{icon}</span>
          <span dangerouslySetInnerHTML={{ __html: content }} />
        </div>
        <div className="flex items-center gap-2">
            {isEditable && <Edit className="h-3 w-3 text-muted-foreground group-hover:text-accent-foreground" />}
            <span className="text-muted-foreground font-mono">{timeFormatted}</span>
        </div>
      </>
    );

     if (event.type === 'period_start' || event.type === 'period_end') {
       return (
        <li key={event.id} className="group">
          <div className={cn(baseClass, styleClass, 'justify-center')}>
            <span className="flex items-center justify-center w-full" dangerouslySetInnerHTML={{ __html: `${icon} ${content} <span class="text-muted-foreground font-mono ml-3">T: ${timeFormatted}</span>` }} />
          </div>
        </li>
      );
    }
    
    return (
      <li key={event.id} className="group">
        <button
          onClick={() => handleEventClick(event)}
          disabled={!isEditable}
          className={cn(
            baseClass, styleClass, 'w-full',
            isEditable && 'cursor-pointer hover:ring-2 hover:ring-accent focus:outline-none focus:ring-2 focus:ring-accent',
            !isEditable && 'cursor-default'
          )}
        >
          {eventBody}
        </button>
      </li>
    );
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-foreground/80 border-b pb-2">
          Historial de Incidencias
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground pt-1">
          Haz clic en un evento para editarlo. Los eventos de falta o inicio/fin de periodo no son editables.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-80 w-full">
          <ul className="space-y-2 pr-4">
            {sortedEvents.length > 0 ? (
              sortedEvents.map((event) => getEventContent(event))
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
