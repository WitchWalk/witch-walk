import { requestCurrentForegroundLocation } from '@/services/location';
import {
  evaluateWaitReportLocation,
  type Coordinates,
} from '@/services/proximity';

export type { WaitReportVerificationResult } from '@/services/proximity';

export async function verifyWaitReportLocation(destination: Coordinates) {
  const result = await requestCurrentForegroundLocation({ requirePrecise: true });
  return evaluateWaitReportLocation(result, destination);
}
