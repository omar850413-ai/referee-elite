'use client';

import type { MatchAction } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { FileText, Trash2 } from 'lucide-react';

type ReportControlsProps = {
  dispatch: React.Dispatch<MatchAction>;
};

const ReportControls = ({ dispatch }: ReportControlsProps) => {
  const openReportModal = () => {
    dispatch({ type: 'OPEN_MODAL', payload: { type: 'report', data: {} } });
  };

  const openResetMatchModal = () => {
    dispatch({ type: 'OPEN_MODAL', payload: { type: 'reset-match', data: {} } });
  };

  return (
    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
      <Button
        onClick={openReportModal}
        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-6 text-sm sm:text-base"
      >
        <FileText className="mr-2 h-5 w-5" />
        Generar Informe
      </Button>
      <Button
        onClick={openResetMatchModal}
        variant="destructive"
        className="font-bold py-6 text-sm sm:text-base"
      >
        <Trash2 className="mr-2 h-5 w-5" />
        Reiniciar Partido
      </Button>
    </div>
  );
};

export default ReportControls;
