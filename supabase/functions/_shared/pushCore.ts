export type PushDelivery = { id: string; to: string; title: string; body: string; data: Record<string, unknown> };

export function normalizeExpoTickets(deliveries: PushDelivery[], payload: unknown) {
  const rows = Array.isArray((payload as { data?: unknown })?.data) ? (payload as { data: unknown[] }).data : [];
  return deliveries.map((delivery, index) => {
    const ticket = (rows[index] ?? {}) as { status?: string; id?: string; details?: { error?: string } };
    return {
      id: delivery.id,
      status: ticket.status === 'ok' ? 'sent' : 'failed',
      ticketId: ticket.id ?? '',
      errorCode: ticket.status === 'ok' ? '' : ticket.details?.error ?? 'ExpoPushUnavailable',
    };
  });
}
