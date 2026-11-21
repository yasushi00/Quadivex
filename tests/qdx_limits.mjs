/** Parse QDX-only search constraints used by CLI evaluation scripts.
 * BUDGET: milliseconds; NODES: maximum search nodes per move;
 * DEPTH: maximum completed iterative-deepening depth.
 * With NODES or DEPTH and no BUDGET, time is unlimited (ms=-1).
 */
export function readQdxLimits(defaultBudgetMs) {
  function optionalInteger(name, min, max) {
    const raw = process.env[name];
    if (raw === undefined) return undefined;
    if (!/^[0-9]+$/.test(raw)) throw Error(`${name}: expected integer ${min}..${max}`);
    const value = Number(raw);
    if (!Number.isSafeInteger(value) || value < min || value > max) {
      throw Error(`${name}: expected integer ${min}..${max}`);
    }
    return value;
  }
  const nodes = optionalInteger('NODES', 1, 100000000);
  const depth = optionalInteger('DEPTH', 1, 60);
  const givenBudget = optionalInteger('BUDGET', 1, 30000);
  const fixed = nodes !== undefined || depth !== undefined;
  return {
    timeMs: givenBudget ?? (fixed ? -1 : defaultBudgetMs),
    nodeLimit: nodes ?? 0,
    depthLimit: depth ?? 0,
    budgetMs: givenBudget ?? (fixed ? null : defaultBudgetMs),
    mode: fixed ? (givenBudget !== undefined ? 'fixed-with-timeout' : 'fixed') : 'time'
  };
}
