import { useState, useEffect, useRef } from 'react';

export function useSatellites(active: boolean, timeOffset: number) {
  const [satellitePositions, setSatellitePositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    if (active && !workerRef.current) {
      setLoading(true);
      
      // Initialize worker. Uses standard URL import for Webpack/Vite
      workerRef.current = new Worker(new URL('../workers/satelliteWorker.ts', import.meta.url), { type: 'module' });
      
      workerRef.current.onmessage = (e) => {
        if (e.data.type === 'UPDATE') {
          setSatellitePositions(e.data.payload);
        }
      };

      // Set initial time offset
      workerRef.current.postMessage({ type: 'SET_OFFSET', payload: { timeOffset } });

      const ctrl = new AbortController();
      fetch('/api/celestrak/NORAD/elements/stations.txt', { signal: ctrl.signal })
        .then(r => r.text())
        .then(text => {
          if (workerRef.current) {
            workerRef.current.postMessage({ type: 'INIT', payload: { tleData: text } });
            workerRef.current.postMessage({ type: 'START' });
          }
        })
        .catch(err => { if (err.name !== 'AbortError') console.error(err); })
        .finally(() => setLoading(false));

      return () => {
        ctrl.abort();
      };
    } else if (!active) {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      setSatellitePositions([]);
    }
  }, [active]);

  useEffect(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'SET_OFFSET', payload: { timeOffset } });
    }
  }, [timeOffset]);

  return { satellitePositions, loading };
}
