// Transport-independent, one connection, bounded retry, per-attraction event coalescing.
export type SafeWaitEvent = { summary: unknown; revision: number; evaluated_at: string };
export type RealtimeTransport = {
  connect: (event: (value: SafeWaitEvent) => void, status: (value: string) => void) => Promise<() => void>;
  reconcile: () => Promise<unknown>;
  apply: (events: SafeWaitEvent[]) => void;
};
export function createWaitRealtimeController(transport: RealtimeTransport, options = { debounce: 150, retry: 3000, poll: 30000 }) {
  let active = false, generation = 0, disconnect: (() => void) | undefined;
  let batch: ReturnType<typeof setTimeout> | undefined, retry: ReturnType<typeof setTimeout> | undefined, poll: ReturnType<typeof setInterval> | undefined;
  const pending = new Map<string, SafeWaitEvent>();
  const reconcile = () => transport.reconcile().catch(() => undefined);
  const connect = async (version: number) => {
    try {
      const close = await transport.connect(value => {
        if (!active || generation !== version) return;
        const summary = value?.summary as { attractionId?: unknown } | undefined;
        if (typeof summary?.attractionId !== 'string' || !Number.isSafeInteger(value.revision) || value.revision < 1) return;
        const previous = pending.get(summary.attractionId);
        if (!previous || previous.revision < value.revision) pending.set(summary.attractionId, value);
        if (!batch) batch = setTimeout(() => {
          batch = undefined;
          const values = [...pending.values()]; pending.clear();
          if (active) transport.apply(values);
        }, options.debounce);
      }, status => {
        if (!active || generation !== version) return;
        if (status === 'SUBSCRIBED') void reconcile(); // Recover initial handshake gap and reconnect gaps.
        if (['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(status) && !retry) retry = setTimeout(() => {
          retry = undefined;
          if (!active || version !== generation) return;
          generation++; disconnect?.(); disconnect = undefined;
          void connect(generation);
        }, options.retry + Math.random() * options.retry);
      });
      if (!active || generation !== version) close(); else disconnect = close;
    } catch {
      if (active && generation === version && !retry) retry = setTimeout(() => { retry = undefined; void connect(version); }, options.retry);
    }
  };
  return {
    async start() {
      if (active) return;
      active = true; const version = ++generation;
      await reconcile();
      if (!active || generation !== version) return;
      poll = setInterval(() => { void reconcile(); }, options.poll);
      void connect(version);
    },
    stop() {
      active = false; generation++; disconnect?.(); disconnect = undefined;
      clearTimeout(batch); clearTimeout(retry); clearInterval(poll);
      batch = retry = poll = undefined; pending.clear();
    },
  };
}
