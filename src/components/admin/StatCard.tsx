import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  suffix?: string;
  color: 'blue' | 'emerald' | 'amber' | 'indigo';
}

const colorMap = {
  blue:    'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400',
  emerald: 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400',
  amber:   'bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400',
  indigo:  'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400',
};

export default function StatCard({ icon: Icon, label, value, suffix, color }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex items-center gap-5 transition-colors">
      <div className={`p-3 rounded-xl ${colorMap[color]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{label}</span>
        <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
          {value}
          {suffix && <span className="text-xs font-normal text-slate-400 ml-1">{suffix}</span>}
        </p>
      </div>
    </div>
  );
}
