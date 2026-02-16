import { NextRequest, NextResponse } from 'next/server';
import { getDataSource } from '@/lib/db';
import { Session } from '@/lib/entities-all';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ds = await getDataSource();
    const session = await ds.getRepository(Session).findOne({
      where: { id },
    });
    if (!session) {
      return NextResponse.json({ error: 'Sessão não encontrada' }, { status: 404 });
    }
    return NextResponse.json({
      id: session.id,
      machineId: session.machineId,
      status: session.status,
      price: session.price,
      createdAt: session.createdAt,
      startedAt: session.startedAt,
      finishedAt: session.finishedAt,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: 'Erro ao buscar sessão' },
      { status: 500 }
    );
  }
}
