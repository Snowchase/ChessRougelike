/**
 * RunContext.tsx — Global run state management
 *
 * Provides the active RunState (null when no run is in progress) and a
 * dispatch function.  Wrap the root layout with <RunProvider>.
 */

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { RunState, RunAction, runReducer } from '../engine/run';

// ─── Context ──────────────────────────────────────────────────────────────────

interface RunContextValue {
  run: RunState | null;
  dispatch: React.Dispatch<RunAction>;
}

const RunContext = createContext<RunContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function RunProvider({ children }: { children: ReactNode }) {
  const [run, dispatch] = useReducer(runReducer, null);

  return (
    <RunContext.Provider value={{ run, dispatch }}>
      {children}
    </RunContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useRun(): RunContextValue {
  const ctx = useContext(RunContext);
  if (!ctx) throw new Error('useRun must be used inside <RunProvider>');
  return ctx;
}
