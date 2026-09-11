import { useEffect, type PropsWithChildren } from 'react';
import { retainWaitRealtime } from '@/services/waitRealtime';
export function WaitRealtimeProvider({ children }: PropsWithChildren) {
  useEffect(() => retainWaitRealtime(), []);
  return children;
}
