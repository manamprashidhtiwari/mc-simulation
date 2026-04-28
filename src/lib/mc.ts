export type StateID = 's0' | 's1' | 's2' | 's3' | 's4' | 's5';

export const REWARDS: Record<StateID, number> = {
  s0: 50,
  s1: -1,
  s2: -3,
  s3: -1,
  s4: -2,
  s5: -4,
};

export type VTable = Record<StateID, number>;

export function computeFirstVisit(episodes: StateID[][], gamma: number): VTable {
  const returns: Record<StateID, number> = { s0: 0, s1: 0, s2: 0, s3: 0, s4: 0, s5: 0 };
  const counts: Record<StateID, number> = { s0: 0, s1: 0, s2: 0, s3: 0, s4: 0, s5: 0 };
  const V: Record<StateID, number> = { s0: 0, s1: 0, s2: 0, s3: 0, s4: 0, s5: 0 };

  for (const ep of episodes) {
    let G = 0;
    // Walk backwards from T-2 down to 0
    for (let t = ep.length - 2; t >= 0; t--) {
      const state = ep[t];
      const nextState = ep[t + 1];
      G = gamma * G + REWARDS[nextState];

      // Check if state was visited earlier in the episode
      let isFirstVisit = true;
      for (let i = 0; i < t; i++) {
        if (ep[i] === state) {
          isFirstVisit = false;
          break;
        }
      }

      if (isFirstVisit) {
        returns[state] += G;
        counts[state] += 1;
      }
    }
  }

  for (const s of Object.keys(V) as StateID[]) {
    V[s] = counts[s] > 0 ? returns[s] / counts[s] : 0;
  }
  return V;
}

export function computeEveryVisit(episodes: StateID[][], gamma: number): VTable {
  const returns: Record<StateID, number> = { s0: 0, s1: 0, s2: 0, s3: 0, s4: 0, s5: 0 };
  const counts: Record<StateID, number> = { s0: 0, s1: 0, s2: 0, s3: 0, s4: 0, s5: 0 };
  const V: Record<StateID, number> = { s0: 0, s1: 0, s2: 0, s3: 0, s4: 0, s5: 0 };

  for (const ep of episodes) {
    let G = 0;
    for (let t = ep.length - 2; t >= 0; t--) {
      const state = ep[t];
      const nextState = ep[t + 1];
      G = gamma * G + REWARDS[nextState];

      // Every visit: no check needed
      returns[state] += G;
      counts[state] += 1;
    }
  }

  for (const s of Object.keys(V) as StateID[]) {
    V[s] = counts[s] > 0 ? returns[s] / counts[s] : 0;
  }
  return V;
}
