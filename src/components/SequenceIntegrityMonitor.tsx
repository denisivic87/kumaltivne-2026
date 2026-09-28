import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, RefreshCw, Wrench } from 'lucide-react';
import { SequenceNumberService, SequenceCorruption } from '../services/sequenceNumberService';

interface SequenceIntegrityMonitorProps {
  userId: string;
  onRepairComplete?: () => void;
}

export const SequenceIntegrityMonitor: React.FC<SequenceIntegrityMonitorProps> = ({
  userId,
  onRepairComplete
}) => {
  const [corruptions, setCorruptions] = useState<SequenceCorruption[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null);

  const checkIntegrity = async () => {
    setIsChecking(true);
    try {
      const issues = await SequenceNumberService.detectUserCorruption(userId);
      setCorruptions(issues);
      setLastCheckTime(new Date());
    } catch (error) {
      console.error('Error checking integrity:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const repairSequences = async () => {
    if (!confirm('Da li ste sigurni da želite da renumeriše sve zapise? Ova akcija će ažurirati redne brojeve na osnovu datuma kreiranja.')) {
      return;
    }

    setIsRepairing(true);
    try {
      const results = await SequenceNumberService.renumberRecords(userId);

      if (results.length > 0) {
        alert(`Uspešno renumerisano ${results[0].renumbered_count} od ${results[0].total_records} zapisa!`);
        await checkIntegrity();

        if (onRepairComplete) {
          onRepairComplete();
        }
      }
    } catch (error) {
      console.error('Error repairing sequences:', error);
      alert('Greška pri renumerisanju zapisa. Molimo pokušajte ponovo.');
    } finally {
      setIsRepairing(false);
    }
  };

  useEffect(() => {
    checkIntegrity();
  }, [userId]);

  if (corruptions.length === 0 && !isChecking) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-800">
                Redni brojevi su ispravni
              </p>
              {lastCheckTime && (
                <p className="text-xs text-green-600 mt-1">
                  Poslednja provjera: {lastCheckTime.toLocaleTimeString('sr-RS')}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={checkIntegrity}
            disabled={isChecking}
            className="flex items-center space-x-2 px-3 py-2 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
            <span>Osvježi</span>
          </button>
        </div>
      </div>
    );
  }

  if (corruptions.length === 0 && isChecking) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-center space-x-3">
          <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
          <p className="text-sm font-medium text-blue-800">
            Provera integriteta rednih brojeva...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800 mb-2">
              Detektovani problemi sa rednim brojevima
            </p>
            <div className="space-y-2">
              {corruptions.map((corruption, index) => (
                <div key={index} className="text-sm text-red-700 bg-red-100 rounded p-2">
                  <span className="font-medium">
                    {corruption.issue_type === 'Duplicate Sequence' && '⚠️ Dupli brojevi'}
                    {corruption.issue_type === 'Missing Sequence' && '⚠️ Praznine/Neredosled u numeraciji'}
                  </span>
                  <span className="ml-2">- {corruption.details}</span>
                  {corruption.affected_count > 1 && (
                    <span className="ml-2 font-mono">
                      ({corruption.affected_count} pogođena)
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={checkIntegrity}
            disabled={isChecking || isRepairing}
            className="flex items-center space-x-2 px-3 py-2 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
            <span>Proveri ponovo</span>
          </button>
          <button
            onClick={repairSequences}
            disabled={isChecking || isRepairing}
            className="flex items-center space-x-2 px-3 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            <Wrench className={`h-4 w-4 ${isRepairing ? 'animate-spin' : ''}`} />
            <span>{isRepairing ? 'Popravka...' : 'Popravi automatski'}</span>
          </button>
        </div>
      </div>
      <div className="text-xs text-red-600 mt-2">
        <strong>Napomena:</strong> Automatska popravka će renumerisati sve zapise po redosledu kreiranja.
      </div>
    </div>
  );
};
