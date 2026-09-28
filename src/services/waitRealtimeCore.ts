// Transport-independent, one connection, bounded retry, per-attraction event coalescing.
export type SafeWaitEvent = { summary: unknown; revision: number; evaluated_at: string };
export type RealtimeTransport = {
  connect: (event: (value: SafeWaitEvent) => void, status: (value: string) => void) => Promise<() => void | Promise<void>>;
  reconcile: () => Promise<unknown>;
  apply: (events: SafeWaitEvent[]) => void;
};
export function createWaitRealtimeController(transport: RealtimeTransport, options: {
  debounce: number; retry: number; poll: number; maximumRetries?: number; maximumRetry?: number;
} = { debounce: 150, retry: 3000, poll: 30000 }) {
  let active = false, generation = 0, attempts = 0, disconnect: (() => void | Promise<void>) | undefined;
  let closing = Promise.resolve();
  let batch: ReturnType<typeof setTimeout> | undefined, retry: ReturnType<typeof setTimeout> | undefined, poll: ReturnType<typeof setInterval> | undefined;
  const pending = new Map<string, SafeWaitEvent>();
  const reconcile = () => transport.reconcile().catch(() => undefined);
  const closeCurrent = () => {
    const close = disconnect; disconnect = undefined;
    closing = closing.then(() => close?.()).catch(() => undefined);
    return closing;
  };
  const scheduleRetry = (version: number) => {
    if (!active || generation !== version || retry) return;
    if (attempts >= (options.maximumRetries ?? 5)) {
      generation++; void closeCurrent(); // Stop SDK channel retries too; polling remains active.
      return;
    }
    const delay = Math.min(options.maximumRetry ?? 30000, options.retry * 2 ** attempts++);
    retry = setTimeout(() => {
      retry = undefined;
      if (!active || version !== generation) return;
      const next = ++generation;
      void closeCurrent().then(() => { if (active && generation === next) void connect(next); });
    }, Math.min(options.maximumRetry ?? 30000, delay * (1 + Math.random() * 0.5)));
  };
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
        if (status === 'SUBSCRIBED') {
          clearTimeout(retry); retry = undefined; attempts = 0;
          void reconcile(); // Recover initial handshake gap and reconnect gaps.
        }
        if (['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(status)) scheduleRetry(version);
      });
      if (!active || generation !== version) await close(); else disconnect = close;
    } catch {
      scheduleRetry(version);
    }
  };
  return {
    async start() {
      if (active) return;
      active = true; attempts = 0; const version = ++generation;
      await closing;
      if (!active || generation !== version) return;
      await reconcile();
      if (!active || generation !== version) return;
      poll = setInterval(() => { void reconcile(); }, options.poll);
      void connect(version);
    },
    stop() {
      active = false; generation++; void closeCurrent();
      clearTimeout(batch); clearTimeout(retry); clearInterval(poll);
      batch = retry = poll = undefined; pending.clear();
    },
  };
}
