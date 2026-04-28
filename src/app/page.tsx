"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Play, Pause, SkipForward, RotateCcw, Plus, Star, ArrowRight, ArrowLeft, ArrowUp, Check } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { StateID, REWARDS, computeFirstVisit, computeEveryVisit, VTable } from '@/lib/mc';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for cleaner tailwind class merging
export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

type Episode = StateID[];

const DEFAULT_EPISODES: Episode[] = [
  ['s4', 's1', 's2', 's1'],
  ['s3', 's0'],
  ['s5', 's4', 's1', 's2']
];

const POLICY_ARROWS: Record<StateID, React.ReactNode> = {
  s0: <Check className="w-6 h-6" />, // Terminal
  s1: <ArrowRight className="w-6 h-6" />,
  s2: <ArrowLeft className="w-6 h-6" />,
  s3: <ArrowUp className="w-6 h-6" />,
  s4: <ArrowUp className="w-6 h-6" />,
  s5: <ArrowLeft className="w-6 h-6" />,
};

type Mode = 'First-Visit' | 'Every-Visit' | 'Both';

const GRID_LAYOUT: StateID[][] = [
  ['s0', 's1', 's2'],
  ['s3', 's4', 's5']
];

export default function MonteCarloApp() {
  // Controls state
  const [gamma, setGamma] = useState<number>(1.0);
  const [episodes, setEpisodes] = useState<{id: string, data: Episode, active: boolean}[]>(
    DEFAULT_EPISODES.map((ep, i) => ({ id: `ep-${i+1}`, data: ep, active: true }))
  );
  const [mode, setMode] = useState<Mode>('Both');
  const [speed, setSpeed] = useState<number>(1000); // ms per step
  
  // Simulation state
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeEpisodeIdx, setActiveEpisodeIdx] = useState<number>(-1);
  const [activeStepIdx, setActiveStepIdx] = useState<number>(-1);
  const [currentG, setCurrentG] = useState<number>(0);
  
  // Historical state for charts
  const [history, setHistory] = useState<any[]>([]);
  const [firstVisitV, setFirstVisitV] = useState<VTable>({ s0:0, s1:0, s2:0, s3:0, s4:0, s5:0 });
  const [everyVisitV, setEveryVisitV] = useState<VTable>({ s0:0, s1:0, s2:0, s3:0, s4:0, s5:0 });

  const activeEpisodes = useMemo(() => episodes.filter(e => e.active).map(e => e.data), [episodes]);

  // Derived simulation data
  const isSimulating = activeEpisodeIdx >= 0;
  const currentEp = isSimulating ? activeEpisodes[activeEpisodeIdx] : null;
  const currentState = (currentEp && activeStepIdx >= 0) ? currentEp[activeStepIdx] : null;

  // Track visit counts for current episode to show stars/badges
  const visitCounts = useMemo(() => {
    if (!currentEp) return {};
    const counts: Record<StateID, number> = { s0:0, s1:0, s2:0, s3:0, s4:0, s5:0 };
    // We only count up to the current step (or rather, we know the whole episode, but are scanning backwards)
    // Actually, let's show all visits that occurred in the episode timeline up to activeStepIdx?
    // Since we scan backwards, activeStepIdx goes from length-2 down to 0.
    // For visual clarity, let's just count occurrences from index 0 to activeStepIdx
    for(let i=0; i<=activeStepIdx; i++) {
      counts[currentEp[i]]++;
    }
    return counts;
  }, [currentEp, activeStepIdx]);

  const isFirstVisitForCurrentState = useMemo(() => {
    if (!currentEp || !currentState || activeStepIdx < 0) return false;
    // It is the first visit if it doesn't appear anywhere before activeStepIdx
    for(let i=0; i<activeStepIdx; i++) {
      if (currentEp[i] === currentState) return false;
    }
    return true;
  }, [currentEp, currentState, activeStepIdx]);

  // Engine logic
  const stepForward = () => {
    if (activeEpisodes.length === 0) return;

    if (activeEpisodeIdx === -1) {
      // Start simulation
      setActiveEpisodeIdx(0);
      setActiveStepIdx(activeEpisodes[0].length - 2);
      setCurrentG(0);
      return;
    }

    if (activeStepIdx >= 0) {
      // We are processing a step
      const state = activeEpisodes[activeEpisodeIdx][activeStepIdx];
      const nextState = activeEpisodes[activeEpisodeIdx][activeStepIdx + 1];
      const nextG = gamma * currentG + REWARDS[nextState];
      
      // We would ideally update V tables here iteratively, but for simplicity we can just recompute everything up to this point
      // Or we can just let it finish the episode and then update the V tables.
      // Let's update V tables incrementally for the chart!
      setCurrentG(nextG);
      setActiveStepIdx(prev => prev - 1);
    } else {
      // Finished an episode, move to next
      const nextEpIdx = activeEpisodeIdx + 1;
      
      // Update charts/history after an episode completes
      const partialEps = activeEpisodes.slice(0, nextEpIdx);
      const fv = computeFirstVisit(partialEps, gamma);
      const ev = computeEveryVisit(partialEps, gamma);
      setFirstVisitV(fv);
      setEveryVisitV(ev);
      setHistory(prev => [...prev, {
        episode: nextEpIdx,
        ...fv // Logging First Visit values for chart, or maybe both? Let's just log FV values as state-value
      }]);

      if (nextEpIdx < activeEpisodes.length) {
        setActiveEpisodeIdx(nextEpIdx);
        setActiveStepIdx(activeEpisodes[nextEpIdx].length - 2);
        setCurrentG(0);
      } else {
        // End of all episodes
        setIsPlaying(false);
        // Do not reset indices immediately so user can see final state
        setActiveEpisodeIdx(activeEpisodes.length); 
      }
    }
  };

  const resetSimulation = () => {
    setIsPlaying(false);
    setActiveEpisodeIdx(-1);
    setActiveStepIdx(-1);
    setCurrentG(0);
    setHistory([]);
    setFirstVisitV({ s0:0, s1:0, s2:0, s3:0, s4:0, s5:0 });
    setEveryVisitV({ s0:0, s1:0, s2:0, s3:0, s4:0, s5:0 });
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying && activeEpisodeIdx < activeEpisodes.length) {
      timer = setTimeout(() => {
        stepForward();
      }, speed);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, activeEpisodeIdx, activeStepIdx, speed, currentG, activeEpisodes, gamma]);

  // Color gradient for V table
  const getCellColor = (val: number, maxVal = 50, minVal = -15) => {
    if (val === 0) return 'bg-[#1E293B]';
    if (val > 0) return `bg-green-500/20 text-green-400`;
    return `bg-red-500/20 text-red-400`;
  };

  return (
    <div className="min-h-screen bg-background text-white p-4 md:p-8 font-sans selection:bg-accent/30">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT PANEL - Controls */}
        <div className="lg:col-span-3 space-y-6 bg-[#162436] p-6 rounded-2xl border border-white/5 shadow-xl">
          <h2 className="text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-accent to-highlight">Controls</h2>
          
          <div className="space-y-4">
            <div>
              <label className="flex justify-between text-sm font-medium mb-2">
                <span>Discount Factor (γ)</span>
                <span className="text-accent">{gamma.toFixed(1)}</span>
              </label>
              <input 
                type="range" min="0" max="1" step="0.1" value={gamma} 
                onChange={(e) => { setGamma(parseFloat(e.target.value)); resetSimulation(); }}
                className="w-full accent-accent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Simulation Mode</label>
              <div className="flex bg-[#0D1B2A] rounded-lg p-1">
                {['First-Visit', 'Every-Visit', 'Both'].map(m => (
                  <button
                    key={m}
                    onClick={() => setMode(m as Mode)}
                    className={cn(
                      "flex-1 text-xs py-2 rounded-md transition-all font-medium",
                      mode === m ? "bg-accent text-white shadow-lg" : "text-gray-400 hover:text-white"
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-white/10">
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-medium">Episodes</label>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                {episodes.map((ep, i) => (
                  <div key={ep.id} className="flex items-center gap-2 bg-[#0D1B2A] p-2 rounded-lg text-xs">
                    <input 
                      type="checkbox" 
                      checked={ep.active} 
                      onChange={() => {
                        const newEps = [...episodes];
                        newEps[i].active = !newEps[i].active;
                        setEpisodes(newEps);
                        resetSimulation();
                      }}
                      className="accent-accent w-4 h-4 rounded border-gray-600"
                    />
                    <span className="font-mono text-gray-300 overflow-hidden text-ellipsis whitespace-nowrap">
                      {ep.data.join(' → ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-white/10">
              <label className="block text-sm font-medium mb-2">Speed</label>
              <div className="flex gap-2">
                {[
                  { label: 'Slow', val: 2000 },
                  { label: 'Med', val: 1000 },
                  { label: 'Fast', val: 300 }
                ].map(s => (
                  <button
                    key={s.label}
                    onClick={() => setSpeed(s.val)}
                    className={cn(
                      "flex-1 py-1 text-xs rounded border transition-colors",
                      speed === s.val ? "border-accent text-accent bg-accent/10" : "border-gray-700 text-gray-400 hover:border-gray-500"
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 flex gap-2">
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all",
                  isPlaying ? "bg-warn text-white hover:bg-warn/90" : "bg-accent text-white hover:bg-accent/90"
                )}
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                {isPlaying ? 'Pause' : 'Play'}
              </button>
              <button 
                onClick={stepForward}
                disabled={isPlaying || activeEpisodeIdx >= activeEpisodes.length}
                className="p-3 bg-[#0D1B2A] hover:bg-white/10 rounded-xl transition-colors disabled:opacity-50"
                title="Step Forward"
              >
                <SkipForward size={18} />
              </button>
              <button 
                onClick={resetSimulation}
                className="p-3 bg-[#0D1B2A] hover:bg-white/10 rounded-xl transition-colors"
                title="Reset"
              >
                <RotateCcw size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* CENTER PANEL - Grid Animation */}
        <div className="lg:col-span-5 flex flex-col space-y-6">
          <div className="flex-1 bg-[#162436] p-6 rounded-2xl border border-white/5 shadow-xl flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold tracking-tight">Environment</h2>
              <div className="text-sm bg-[#0D1B2A] px-3 py-1 rounded-full text-accent font-mono border border-accent/20">
                {isSimulating && activeEpisodeIdx < activeEpisodes.length 
                  ? `Ep ${activeEpisodeIdx + 1} / ${activeEpisodes.length}` 
                  : 'Idle'}
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center">
              <div className="grid grid-cols-3 gap-3 md:gap-4 w-full max-w-md relative">
                {GRID_LAYOUT.flat().map((state) => {
                  const isCurrent = state === currentState;
                  const isTerminal = state === 's0';
                  const reward = REWARDS[state];
                  
                  return (
                    <div 
                      key={state}
                      className={cn(
                        "aspect-square rounded-2xl border-2 flex flex-col items-center justify-center relative transition-all duration-300",
                        isTerminal ? "border-highlight bg-highlight/10 shadow-[0_0_15px_rgba(6,214,160,0.2)]" : "border-[#2A3B4C] bg-[#0D1B2A]",
                        isCurrent && !isTerminal && "border-accent shadow-[0_0_20px_rgba(0,180,216,0.4)] scale-105 z-10 bg-accent/10"
                      )}
                    >
                      {/* State Label & Reward */}
                      <div className="absolute top-2 left-2 text-xs font-mono text-gray-400">{state}</div>
                      <div className={cn(
                        "text-xl md:text-2xl font-bold",
                        reward > 0 ? "text-highlight" : "text-warn"
                      )}>
                        {reward > 0 ? `+${reward}` : reward}
                      </div>

                      {/* Policy Arrow */}
                      <div className="absolute bottom-2 right-2 text-gray-500 opacity-50">
                        {POLICY_ARROWS[state]}
                      </div>

                      {/* Animation Overlay for Current State */}
                      <AnimatePresence>
                        {isCurrent && (
                          <motion.div 
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            className="absolute -top-3 -right-3 flex gap-1"
                          >
                            {/* G Value Badge */}
                            <div className="bg-white text-black text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                              G={currentG.toFixed(1)}
                            </div>
                          </motion.div>
                        )}
                        {isCurrent && isFirstVisitForCurrentState && ['First-Visit', 'Both'].includes(mode) && (
                           <motion.div 
                           initial={{ scale: 0, rotate: -180 }}
                           animate={{ scale: 1, rotate: 0 }}
                           className="absolute -top-3 -left-3 text-yellow-400 drop-shadow-md"
                         >
                           <Star size={20} fill="currentColor" />
                         </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Every-Visit Counter */}
                      {['Every-Visit', 'Both'].includes(mode) && visitCounts[state] > 0 && (
                        <div className="absolute bottom-2 left-2 bg-accent/20 text-accent text-[10px] font-bold px-1.5 py-0.5 rounded">
                          {visitCounts[state]}v
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Episode Log */}
            <div className="mt-6 h-32 bg-[#0D1B2A] rounded-xl p-4 overflow-y-auto font-mono text-sm border border-white/5 custom-scrollbar relative">
              <div className="text-gray-400 mb-2 sticky top-0 bg-[#0D1B2A] z-10 pb-1 border-b border-gray-800">
                Backward G Calculation Log
              </div>
              <AnimatePresence>
                {activeEpisodeIdx >= 0 && activeEpisodeIdx < activeEpisodes.length && (
                  <motion.div initial={{opacity:0}} animate={{opacity:1}}>
                    <div className="text-accent mb-1">Episode {activeEpisodeIdx + 1}: {activeEpisodes[activeEpisodeIdx].join(' → ')}</div>
                    <div className="text-gray-300">
                      {activeStepIdx >= 0 ? (
                        <>
                          Step t={activeStepIdx}: state <span className="text-white font-bold">{currentState}</span>
                          <br/>
                          <span className="text-gray-500">
                            G = {gamma.toFixed(1)} * {currentG.toFixed(1)} + {REWARDS[activeEpisodes[activeEpisodeIdx][activeStepIdx + 1]]} = 
                          </span> 
                          <span className="text-highlight font-bold ml-2">
                            {(gamma * currentG + REWARDS[activeEpisodes[activeEpisodeIdx][activeStepIdx + 1]]).toFixed(1)}
                          </span>
                        </>
                      ) : (
                        <span className="text-highlight">Episode completed. Value tables updated.</span>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL - Value Functions & Charts */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-[#162436] p-6 rounded-2xl border border-white/5 shadow-xl">
            <h2 className="text-2xl font-bold tracking-tight mb-4">Value Function V(s)</h2>
            
            <div className="overflow-hidden rounded-xl border border-white/10">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#0D1B2A] text-gray-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">State</th>
                    {['First-Visit', 'Both'].includes(mode) && <th className="px-4 py-3 font-medium text-center">First-Visit</th>}
                    {['Every-Visit', 'Both'].includes(mode) && <th className="px-4 py-3 font-medium text-center">Every-Visit</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {['s0', 's1', 's2', 's3', 's4', 's5'].map((state) => (
                    <tr key={state} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 font-mono text-gray-300">
                        {state} {state === 's0' && <span className="text-xs text-highlight ml-1">(T)</span>}
                      </td>
                      {['First-Visit', 'Both'].includes(mode) && (
                        <td className="px-4 py-3 text-center">
                          {state === 's0' ? (
                            <span className="px-2 py-1 rounded bg-highlight/10 text-highlight font-mono">T</span>
                          ) : (
                            <span className={cn("px-2 py-1 rounded font-mono font-medium transition-colors", getCellColor(firstVisitV[state as StateID]))}>
                              {firstVisitV[state as StateID].toFixed(2)}
                            </span>
                          )}
                        </td>
                      )}
                      {['Every-Visit', 'Both'].includes(mode) && (
                        <td className="px-4 py-3 text-center">
                           {state === 's0' ? (
                            <span className="px-2 py-1 rounded bg-highlight/10 text-highlight font-mono">T</span>
                          ) : (
                            <span className={cn("px-2 py-1 rounded font-mono font-medium transition-colors", getCellColor(everyVisitV[state as StateID]))}>
                              {everyVisitV[state as StateID].toFixed(2)}
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-[#162436] p-6 rounded-2xl border border-white/5 shadow-xl h-[300px] flex flex-col">
            <h2 className="text-lg font-bold tracking-tight mb-4 text-gray-200">First-Visit Convergence</h2>
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A3B4C" />
                  <XAxis dataKey="episode" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#0D1B2A', border: '1px solid #2A3B4C', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                    labelStyle={{ display: 'none' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  {['s1', 's2', 's3', 's4', 's5'].map((s, i) => {
                    const colors = ['#00B4D8', '#06D6A0', '#FFD166', '#EF476F', '#118AB2'];
                    return (
                      <Line 
                        key={s} 
                        type="monotone" 
                        dataKey={s} 
                        stroke={colors[i]} 
                        strokeWidth={2}
                        dot={{ r: 3, fill: '#0D1B2A', strokeWidth: 2 }}
                        activeDot={{ r: 5 }}
                        isAnimationActive={true}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
