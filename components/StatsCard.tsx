
import React from 'react';

interface Props {
  label: string;
  value: string | number;
  unit?: string;
  icon?: React.ReactNode;
}

const StatsCard: React.FC<Props> = ({ label, value, unit, icon }) => {
  return (
    <div className="glass p-5 rounded-2xl flex flex-col justify-between border border-slate-700/50">
      <div className="flex items-center gap-2 text-slate-400 mb-2">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-bold text-white tabular-nums">{value}</span>
        {unit && <span className="text-sm font-medium text-slate-500">{unit}</span>}
      </div>
    </div>
  );
};

export default StatsCard;
