
import React, { useMemo } from 'react';
import { RoutePoint } from '../types';

interface Props {
  route: RoutePoint[];
}

const RouteVisualizer: React.FC<Props> = ({ route }) => {
  const svgPath = useMemo(() => {
    if (route.length < 2) return "";

    const lats = route.map(p => p.latitude);
    const lngs = route.map(p => p.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const padding = 20;
    const width = 300;
    const height = 300;

    const scaleX = (val: number) => padding + ((val - minLng) / (maxLng - minLng || 1)) * (width - 2 * padding);
    const scaleY = (val: number) => height - (padding + ((val - minLat) / (maxLat - minLat || 1)) * (height - 2 * padding));

    return route.map((p, i) => {
      const x = scaleX(p.longitude);
      const y = scaleY(p.latitude);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  }, [route]);

  return (
    <div className="relative w-full aspect-square glass rounded-3xl overflow-hidden border border-slate-700 flex items-center justify-center">
      {route.length > 1 ? (
        <svg viewBox="0 0 300 300" className="w-full h-full drop-shadow-[0_0_8px_rgba(132,204,22,0.4)]">
          <path
            d={svgPath}
            fill="none"
            stroke="#84cc16"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Start Point */}
          <circle cx={svgPath.split(' ')[1]} cy={svgPath.split(' ')[2]} r="5" fill="#3b82f6" />
          {/* End Point */}
          <circle cx={svgPath.split(' ').slice(-2)[0]} cy={svgPath.split(' ').slice(-1)[0]} r="6" fill="#ef4444" className="animate-pulse" />
        </svg>
      ) : (
        <div className="text-slate-500 text-sm font-medium flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full border-4 border-slate-800 border-t-lime-500 animate-spin" />
            Waiting for GPS signal...
        </div>
      )}
      
      <div className="absolute top-4 left-4 flex gap-2">
         <div className="px-3 py-1 bg-slate-900/80 rounded-full text-[10px] font-bold uppercase tracking-widest text-lime-500 border border-lime-500/30">Live Map</div>
      </div>
    </div>
  );
};

export default RouteVisualizer;
