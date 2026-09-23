import { describe, expect, it } from 'vitest';
import {
  ORDER_CANCELLATION_WINDOW_MS,
  isWithinOrderCancellationWindow
} from '../utils/orderCancellation';

describe('order cancellation window', () => {
  const createdAt = new Date('2026-09-23T10:00:00.000Z').getTime();

  it('allows cancellation through exactly two minutes', () => {
    expect(
      isWithinOrderCancellationWindow(
        new Date(createdAt),
        createdAt + ORDER_CANCELLATION_WINDOW_MS
      )
    ).toBe(true);
  });

  it('rejects cancellation after two minutes', () => {
    expect(
      isWithinOrderCancellationWindow(
        new Date(createdAt),
        createdAt + ORDER_CANCELLATION_WINDOW_MS + 1
      )
    ).toBe(false);
  });

  it('rejects timestamps in the future', () => {
    expect(
      isWithinOrderCancellationWindow(
        new Date(createdAt),
        createdAt - 1
      )
    ).toBe(false);
  });

  it('rejects invalid timestamps', () => {
    expect(isWithinOrderCancellationWindow('not-a-date', createdAt)).toBe(false);
  });
});
