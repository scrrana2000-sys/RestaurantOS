export const ORDER_CANCELLATION_WINDOW_MS = 2 * 60 * 1000;

export function getOrderCreatedAtMs(createdAt: any): number | null {
  if (!createdAt) return null;

  try {
    if (typeof createdAt.toDate === 'function') {
      const date = createdAt.toDate();
      const ms = date?.getTime?.();
      return typeof ms === 'number' && Number.isFinite(ms) ? ms : null;
    }

    if (createdAt instanceof Date) {
      const ms = createdAt.getTime();
      return Number.isFinite(ms) ? ms : null;
    }

    const ms = new Date(createdAt).getTime();
    return Number.isFinite(ms) ? ms : null;
  } catch {
    return null;
  }
}

export function isWithinOrderCancellationWindow(
  createdAt: any,
  nowMs = Date.now()
): boolean {
  const createdAtMs = getOrderCreatedAtMs(createdAt);
  if (createdAtMs === null) return false;

  const elapsedMs = nowMs - createdAtMs;
  return elapsedMs >= 0 && elapsedMs <= ORDER_CANCELLATION_WINDOW_MS;
}
