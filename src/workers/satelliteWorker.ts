import * as satellite from 'satellite.js';

let satellites: any[] = [];
let timer: ReturnType<typeof setInterval> | null = null;
let timeOffset = 0;

self.onmessage = (e) => {
  const { type, payload } = e.data;

  if (type === 'INIT') {
    const lines = payload.tleData.split('\n');
    satellites = [];
    for (let i = 0; i < lines.length - 2; i += 3) {
      const name = lines[i].trim();
      const tle1 = lines[i + 1]?.trim();
      const tle2 = lines[i + 2]?.trim();
      if (name && tle1 && tle2) {
        try {
          const satrec = satellite.twoline2satrec(tle1, tle2);
          satellites.push({
            id: `sat-${i}`,
            name,
            satrec,
            featureType: 'satellite'
          });
        } catch (err) {}
      }
    }
  }

  if (type === 'SET_OFFSET') {
    timeOffset = payload.timeOffset;
  }

  if (type === 'START') {
    if (timer) clearInterval(timer);
    
    const tick = () => {
      const date = new Date(Date.now() + timeOffset * 1000);
      const positions = [];
      
      for (const sat of satellites) {
        try {
          const pv = satellite.propagate(sat.satrec, date);
          const pos = pv.position;
          if (typeof pos === 'boolean') continue;
          const gmst = satellite.gstime(date);
          const gd = satellite.eciToGeodetic(pos as satellite.EciVec3<number>, gmst);
          positions.push({
            id: sat.id,
            name: sat.name,
            position: [satellite.degreesLong(gd.longitude), satellite.degreesLat(gd.latitude), gd.height * 1000],
            featureType: sat.featureType
          });
        } catch (e) {
          // ignore parsing/propagation errors
        }
      }
      
      self.postMessage({ type: 'UPDATE', payload: positions });
    };

    tick(); // initial tick
    timer = setInterval(tick, 1000);
  }

  if (type === 'STOP') {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }
};
