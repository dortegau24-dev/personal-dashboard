'use client';

import { useState } from 'react';
import { CrossFitView } from './CrossFitView';
import { JiujitsuView } from './JiujitsuView';
import { TriathlonView } from './TriathlonView';
import { BodyCompView } from './BodyCompView';
import { Dumbbell, Shield, Timer, Scale } from 'lucide-react';
import type {
  CrossfitWod, CrossfitPR,
  JiujitsuSession, JiujitsuBeltHistory,
  TriathlonSession,
  WeightEntry, WhoopData,
} from './types';

type Props = {
  wods: CrossfitWod[];
  prs: CrossfitPR[];
  bjjSessions: JiujitsuSession[];
  beltHistory: JiujitsuBeltHistory[];
  triSessions: TriathlonSession[];
  weightEntries: WeightEntry[];
  whoopData: WhoopData[];
};

const TABS = [
  { key: 'crossfit', label: 'CrossFit', icon: Dumbbell },
  { key: 'bjj', label: 'Jiujitsu', icon: Shield },
  { key: 'tri', label: 'Triathlon', icon: Timer },
  { key: 'body', label: 'Body Comp', icon: Scale },
] as const;

type TabKey = typeof TABS[number]['key'];

export function TrainingView(props: Props) {
  const [tab, setTab] = useState<TabKey>('crossfit');

  // Simple no-op refresh for now; server data is passed initially
  const noop = () => {};

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <header>
        <p className="text-[10px] uppercase tracking-[0.3em] text-silver-dim mb-1">Performance</p>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Training</h1>
      </header>

      <div className="flex items-center gap-1 p-1 glass rounded-xl w-fit overflow-x-auto">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition ${
              tab === key ? 'bg-white/[0.08] text-white' : 'text-silver-dim hover:text-white'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'crossfit' && (
        <CrossFitView wods={props.wods} prs={props.prs} onChanged={noop} />
      )}
      {tab === 'bjj' && (
        <JiujitsuView sessions={props.bjjSessions} beltHistory={props.beltHistory} onChanged={noop} />
      )}
      {tab === 'tri' && (
        <TriathlonView sessions={props.triSessions} onChanged={noop} />
      )}
      {tab === 'body' && (
        <BodyCompView weightEntries={props.weightEntries} whoopData={props.whoopData} onChanged={noop} />
      )}
    </div>
  );
}
