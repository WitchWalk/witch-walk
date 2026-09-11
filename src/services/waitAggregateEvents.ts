import type { WaitTimeAggregate } from './waitReportCore';
const listeners = new Set<(values: WaitTimeAggregate[]) => void>();
export function publishWaitAggregates(values: WaitTimeAggregate[]) { listeners.forEach(listener => listener(values)); }
export function subscribeWaitAggregates(listener: (values: WaitTimeAggregate[]) => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
