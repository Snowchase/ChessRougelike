/**
 * RunContext.tsx — Global Run State
 *
 * Provides RunState and dispatch to all screens via React context.
 * The RunState persists across all nodes in a run (map, battles, shop, rest).
 */

import React, { createContext, useContext, useReducer } from 'react';
import {
  RunState,
  RunAction,
  runReducer,
  createInitialRunState,
  PlayerClass,
} from '@/src/engine/run';

// ─── Context Shape ────────────────────────────────────────────────────────────

interface RunContextValue {
  runState: RunState | null;
  dispatch: React.Dispatch<RunAction>;
}

const RunContext = createContext<RunContextValue>({
  runState: null,
  dispatch: () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

type NullableRunState = RunState | null;

function nullableRunReducer(
  state: NullableRunState,
  action: RunAction,
): NullableRunState {
  if (action.type === 'START_RUN') {
    return createInitialRunState(action.playerClass);
  }
  if (state === null) return null;
  return runReducer(state, action);
}

export function RunProvider({ children }: { children: React.ReactNode }) {
  const [runState, dispatch] = useReducer(nullableRunReducer, null);

  return (
    <RunContext.Provider value={{ runState, dispatch }}>
      {children}
    </RunContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useRun(): RunContextValue {
  return useContext(RunContext);
}
