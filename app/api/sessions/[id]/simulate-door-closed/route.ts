import { NextRequest, NextResponse } from 'next/server';
import { getDataSource } from '@/lib/db';
import { Session } from '@/lib/entities-all';
import { emitSessionEvent } from '@/lib/events';

/**
 * Emite evento PORTA_FECHADA na stream da sessão (para desenvolvimento/testes sem hardware).
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const ds = await getDataSource();
    const session = await ds.getRepository(Session).findOne({ where: { id: sessionId } });
    if (!session) {
      return NextResponse.json({ error: 'Sessão não encontrada' }, { status: 404 });
    }
    emitSessionEvent(sessionId, 'PORTA_FECHADA');
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro' }, { status: 500 });
  }
}
