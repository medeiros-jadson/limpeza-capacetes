type SessionEventListener = (payload: { event: string; data?: unknown }) => void;
const listeners = new Map<string, Set<SessionEventListener>>();

export function emitSessionEvent(sessionId: string, event: string, data?: unknown) {
  const set = listeners.get(sessionId);
  if (set) {
    set.forEach((fn) => fn({ event, data }));
  }
}

export function subscribeSession(sessionId: string, fn: SessionEventListener) {
  if (!listeners.has(sessionId)) {
    listeners.set(sessionId, new Set());
  }
  listeners.get(sessionId)!.add(fn);
  return () => {
    listeners.get(sessionId)?.delete(fn);
  };
}
