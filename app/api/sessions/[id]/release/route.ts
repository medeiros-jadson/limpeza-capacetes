import { NextRequest, NextResponse } from 'next/server';
import { getDataSource } from '@/lib/db';
import { Session, SessionStatus } from '@/lib/entities-all';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const ds = await getDataSource();
    const session = await ds.getRepository(Session).findOne({
      where: { id: sessionId },
    });
    if (!session) {
      return NextResponse.json({ error: 'Sessão não encontrada' }, { status: 404 });
    }
    if (session.status !== SessionStatus.PAID) {
      return NextResponse.json(
        { error: 'Sessão não está paga ou já em execução' },
        { status: 400 }
      );
    }
    return NextResponse.json({
      ok: true,
      message: 'Máquina liberada; o ESP32 receberá START_CYCLE no próximo polling.',
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: 'Erro ao liberar ciclo' },
      { status: 500 }
    );
  }
}
