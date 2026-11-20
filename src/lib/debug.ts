// Verbose diagnostics — printed in development only. Use console.warn/error for real problems.
export function debug(...args: unknown[]): void {
  if (process.env.NODE_ENV !== 'production') console.log(...args);
}
