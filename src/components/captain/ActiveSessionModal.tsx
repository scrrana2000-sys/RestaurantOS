import React, { useEffect, useState } from 'react';
import { Table, TableSession } from '../../types/table';
import { Order } from '../../types/order';
import { KOT } from '../../types/kot';
import { StaffRole } from '../../types/auth';
import { isWithinOrderCancellationWindow, getOrderCreatedAtMs, ORDER_CANCELLATION_WINDOW_MS } from '../../utils/orderCancellation';
import {
  X,
  Users,
  Clock,
  Utensils,
  CookingPot,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  CreditCard,
  LogOut,
  Send
} from 'lucide-react';

interface ActiveSessionModalProps {
  isOpen: boolean;
  table: Table | null;
  session: TableSession | null;
  order: Order | null;
  kots: KOT[];
  onClose: () => void;
  onSendKotToKitchen: (orderId: string, tableId: string) => Promise<void>;
  onCloseSession: (sessionId: string) => Promise<void>;
  onUpdateGuestCount?: (sessionId: string, newGuestCount: number) => Promise<void>;
  onUpdateKotStatus?: (kotId: string, newStatus: any) => Promise<void>;
  onCancelKot?: (kotId: string, reason: string) => Promise<void>;
  onCancelOrder?: (orderId: string, reason: string) => Promise<void>;
  userRole?: StaffRole;
  onGoToPosOrder: (tableId: string) => void;
  onGoToPosSettlement: (tableId: string) => void;
  isSubmitting: boolean;
}

export const ActiveSessionModal: React.FC<ActiveSessionModalProps> = ({
  isOpen,
  table,
  session,
  order,
  kots,
  onClose,
  onSendKotToKitchen,
  onCloseSession,
  onUpdateGuestCount,
  onUpdateKotStatus,
  onCancelKot,
  onCancelOrder,
  userRole,
  onGoToPosOrder,
  onGoToPosSettlement,
  isSubmitting
}) => {
  const [actionError, setActionError] = useState<string | null>(null);
  const [cancelKotId, setCancelKotId] = useState<string | null>(null);
  const [cancelKotReason, setCancelKotReason] = useState('');
  const [showCancelOrderInput, setShowCancelOrderInput] = useState(false);
  const [cancelOrderReason, setCancelOrderReason] = useState('');
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!isOpen || !order) return;
    setNowMs(Date.now());
    const intervalId = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, [isOpen, order?.id]);

  if (!isOpen || !table || !session) return null;

  // Filter KOTs for this table
  const tableKots = kots.filter((k) => k.tableId === table.id);
  const orderCreatedAtMs = order ? getOrderCreatedAtMs(order.createdAt) : null;
  const orderCancelWindowOpen = orderCreatedAtMs !== null && isWithinOrderCancellationWindow(order.createdAt, nowMs);
  const canCancelOrder = !!order && order.status !== 'cancelled' && order.status !== 'completed' && !!onCancelOrder && (userRole !== 'captain' || orderCancelWindowOpen);
  const remainingOrderCancelSeconds = orderCreatedAtMs !== null
    ? Math.max(0, Math.ceil((orderCreatedAtMs + ORDER_CANCELLATION_WINDOW_MS - nowMs) / 1000))
    : 0;

  // Calculate elapsed session time
  let elapsedMinutes = 0;
  if (session.openedAt) {
    const openedTime =
      typeof session.openedAt?.toDate === 'function'
        ? session.openedAt.toDate().getTime()
        : new Date(session.openedAt).getTime();
    if (!isNaN(openedTime)) {
      elapsedMinutes = Math.max(0, Math.floor((Date.now() - openedTime) / (1000 * 60)));
    }
  }

  const handleSendKot = async () => {
    if (!order) return;
    setActionError(null);
    try {
      await onSendKotToKitchen(order.id, table.id);
    } catch (err: any) {
      setActionError(err?.message || 'Failed to dispatch KOT to kitchen.');
    }
  };

  const handleConfirmCancelKot = async (kotId: string) => {
    setActionError(null);
    if (!cancelKotReason.trim()) {
      setActionError('Cancellation reason is required.');
      return;
    }
    if (!onCancelKot) return;
    try {
      await onCancelKot(kotId, cancelKotReason.trim());
      setCancelKotId(null);
      setCancelKotReason('');
    } catch (err: any) {
      setActionError(err?.message || 'Failed to cancel KOT.');
    }
  };

  const handleConfirmCancelOrder = async () => {
    setActionError(null);
    if (!cancelOrderReason.trim()) {
      setActionError('Cancellation reason is required.');
      return;
    }
    if (!onCancelOrder || !order) return;
    try {
      await onCancelOrder(order.id, cancelOrderReason.trim());
      setShowCancelOrderInput(false);
      setCancelOrderReason('');
      onClose();
    } catch (err: any) {
      setActionError(err?.message || 'Failed to cancel order.');
    }
  };

  const handleCloseSessionAction = async () => {
    setActionError(null);
    try {
      await onCloseSession(session.id);
      onClose();
    } catch (err: any) {
      setActionError(err?.message || 'Failed to close table session.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 text-white shadow-2xl animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Table {table.tableNumber} — Active Session
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                  Occupied
                </span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-slate-950/60 border border-slate-800 rounded-lg px-2 py-0.5">
                  <span className="font-semibold text-slate-300">{session.guestCount} Guests</span>
                  {onUpdateGuestCount && (
                    <div className="flex items-center gap-1 ml-1 border-l border-slate-800 pl-1">
                      <button
                        type="button"
                        data-testid="btn-decrement-guests"
                        disabled={isSubmitting || session.guestCount <= 1}
                        onClick={async () => {
                          setActionError(null);
                          try {
                            await onUpdateGuestCount(session.id, session.guestCount - 1);
                          } catch (err: any) {
                            setActionError(err?.message || 'Failed to update guest count');
                          }
                        }}
                        className="w-4 h-4 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 flex items-center justify-center font-bold text-xs disabled:opacity-30"
                        title="Reduce guests"
                      >
                        -
                      </button>
                      <button
                        type="button"
                        data-testid="btn-increment-guests"
                        disabled={isSubmitting || session.guestCount >= table.capacity}
                        onClick={async () => {
                          setActionError(null);
                          try {
                            await onUpdateGuestCount(session.id, session.guestCount + 1);
                          } catch (err: any) {
                            setActionError(err?.message || 'Failed to update guest count');
                          }
                        }}
                        className="w-4 h-4 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 flex items-center justify-center font-bold text-xs disabled:opacity-30"
                        title="Increase guests"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
                <span>•</span>
                <span>Opened {elapsedMinutes}m ago</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Error Banner */}
        {actionError && (
          <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="my-4 space-y-4 overflow-y-auto flex-1 pr-1">
          {/* Active Order Section */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Utensils className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">
                  {order ? `Order #${order.orderNumber}` : 'No Active Order'}
                </h3>
              </div>
              {order && (
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {order.status}
                </span>
              )}
            </div>

            {order ? (
              <div className="space-y-2">
                <div className="text-xs text-slate-400 font-semibold">Ordered Items:</div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {order.items?.map((item, idx) => (
                    <div
                      key={item.itemId + idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-slate-800 text-amber-400 font-bold flex items-center justify-center text-[11px]">
                          {item.quantity}x
                        </span>
                        <span className="font-semibold text-slate-200">{item.nameSnapshot}</span>
                      </div>
                      {item.notes && (
                        <span className="text-[10px] italic text-slate-400 truncate max-w-[150px]">
                          "{item.notes}"
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                There is currently no active order associated with this table session.
              </p>
            )}

            {canCancelOrder && !showCancelOrderInput && (
              <div className="pt-2 border-t border-slate-800">
                <button
                  type="button"
                  data-testid="session-btn-show-cancel-order"
                  onClick={() => setShowCancelOrderInput(true)}
                  className="w-full py-2 rounded-xl bg-slate-950 border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 font-bold text-xs inline-flex items-center justify-center gap-2 transition-colors"
                >
                  <span>Cancel Order</span>
                  {userRole === 'captain' && <span className="text-[10px] text-rose-300/80">({remainingOrderCancelSeconds}s left)</span>}
                </button>
              </div>
            )}

            {showCancelOrderInput && canCancelOrder && (
              <div className="mt-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-2.5">
                <p className="text-xs font-bold text-rose-300">Cancel this order?</p>
                <input type="text" value={cancelOrderReason} onChange={(e) => setCancelOrderReason(e.target.value)} placeholder="Enter cancellation reason..." className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-rose-500" />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowCancelOrderInput(false)} className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 font-bold text-xs">Keep Order</button>
                  <button type="button" data-testid="session-btn-confirm-cancel-order" disabled={isSubmitting} onClick={handleConfirmCancelOrder} className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs">Confirm Cancel Order</button>
                </div>
              </div>
            )}

            {order && userRole === 'captain' && !canCancelOrder && order.status !== 'cancelled' && order.status !== 'completed' && (
              <p className="pt-2 text-[10px] font-semibold text-slate-500 text-center">2-minute waiter cancellation window expired. Active KOTs can still be cancelled below.</p>
            )}
          </div>

          {/* Kitchen KOT Progress Section */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <CookingPot className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Kitchen Order Tickets (KOTs)</h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">{tableKots.length} KOTs</span>
            </div>

            {tableKots.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No KOT tickets dispatched yet.</p>
            ) : (
              <div className="space-y-2">
                {tableKots.map((kot) => (
                  <div
                    key={kot.id}
                    className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-200">{kot.kotNumber}</span>
                        <span className="text-[11px] text-slate-400 ml-2">
                          ({kot.items.length} items)
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                          kot.status === 'sentToKitchen'
                            ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                            : kot.status === 'preparing'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : kot.status === 'ready'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 animate-pulse'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {kot.status}
                      </span>
                      {kot.status === 'ready' && onUpdateKotStatus && (
                        <button
                          type="button"
                          data-testid={`session-btn-serve-kot-${kot.id}`}
                          onClick={async () => {
                            setActionError(null);
                            try {
                              await onUpdateKotStatus(kot.id, 'served');
                            } catch (err: any) {
                              setActionError(err?.message || 'Failed to serve KOT');
                            }
                          }}
                          className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition-colors"
                        >
                          Serve
                        </button>
                      )}
                      {kot.status !== 'served' && kot.status !== 'cancelled' && onCancelKot && (
                        <button
                          type="button"
                          data-testid={`session-btn-cancel-kot-${kot.id}`}
                          disabled={isSubmitting}
                          onClick={() => {
                            setCancelKotId(kot.id);
                            setCancelKotReason('');
                          }}
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-rose-600/20 text-slate-400 hover:text-rose-300 font-bold text-[10px] transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                      </div>
                    </div>
                    {cancelKotId === kot.id && (
                      <div className="mt-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-2">
                        <p className="text-[10px] font-bold text-rose-300">Reason for KOT cancellation</p>
                        <input
                          type="text"
                          value={cancelKotReason}
                          onChange={(e) => setCancelKotReason(e.target.value)}
                          placeholder="Enter cancellation reason..."
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                        />
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => setCancelKotId(null)} className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 font-bold text-[10px]">Keep</button>
                          <button type="button" disabled={isSubmitting} data-testid={`session-btn-confirm-cancel-kot-${kot.id}`} onClick={() => handleConfirmCancelKot(kot.id)} className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px]">Confirm Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Operational Controls */}
        <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
          {/* Close Session */}
          <button
            type="button"
            data-testid="btn-close-session"
            onClick={handleCloseSessionAction}
            disabled={isSubmitting}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold inline-flex items-center gap-1.5 transition-colors border border-slate-700 min-h-[40px]"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-400" />
            <span>Close Session</span>
          </button>

          <div className="flex items-center gap-2">
            {/* Take Order / Add Items */}
            <button
              type="button"
              data-testid="btn-captain-add-order"
              onClick={() => {
                onClose();
                onGoToPosOrder(table.id);
              }}
              className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors min-h-[40px]"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{order ? 'Add Items' : 'Take Order'}</span>
            </button>

            {/* Send KOT if order exists */}
            {order && (
              <button
                type="button"
                data-testid="btn-captain-send-kot"
                onClick={handleSendKot}
                disabled={isSubmitting}
                className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50 min-h-[40px]"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send KOT</span>
              </button>
            )}

            {/* POS Settlement Link */}
            <button
              type="button"
              data-testid="btn-captain-settlement"
              onClick={() => {
                onClose();
                onGoToPosSettlement(table.id);
              }}
              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors min-h-[40px]"
              title="Navigate to POS Terminal for Billing & Settlement"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>POS Billing</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
