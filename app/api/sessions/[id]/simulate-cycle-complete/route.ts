import { NextRequest, NextResponse } from 'next/server';
import { getDataSource } from '@/lib/db';
import { Session, SessionStatus } from '@/lib/entities-all';
import { emitSessionEvent } from '@/lib/events';

/**
 * Em desenvolvimento: emite UV_ON, depois UV_OFF (após 3s), depois FINISHED (após 0,5s)
 * e atualiza a sessão para FINISHED. Permite testar o fluxo sem hardware.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id: sessionId } = await params;
    const ds = await getDataSource();
    const session = await ds.getRepository(Session).findOne({ where: { id: sessionId } });
    if (!session) {
      return NextResponse.json({ error: 'Sessão não encontrada' }, { status: 404 });
    }
    if (session.status !== SessionStatus.PAID && session.status !== SessionStatus.RUNNING) {
      return NextResponse.json({ error: 'Sessão não está aguardando ciclo' }, { status: 400 });
    }

    if (session.status === SessionStatus.PAID) {
      session.status = SessionStatus.RUNNING;
      session.startedAt = new Date();
      await ds.getRepository(Session).save(session);
    }

    emitSessionEvent(sessionId, 'UV_ON');

    setTimeout(() => {
      emitSessionEvent(sessionId, 'UV_OFF');
      setTimeout(async () => {
        emitSessionEvent(sessionId, 'FINISHED');
        try {
          const d = await getDataSource();
          const s = await d.getRepository(Session).findOne({ where: { id: sessionId } });
          if (s) {
            s.status = SessionStatus.FINISHED;
            s.finishedAt = new Date();
            await d.getRepository(Session).save(s);
          }
        } catch (e) {
          console.error('[simulate-cycle-complete]', e);
        }
      }, 500);
    }, 3000);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro' }, { status: 500 });
  }
}
