import { NextRequest, NextResponse } from 'next/server';
import { getDataSource } from '@/lib/db';
import { Machine, MachineStatus } from '@/lib/entities-all';
import { Session, SessionStatus } from '@/lib/entities-all';

function getMachineFromAuth(request: NextRequest): string | null {
  const auth = request.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  return request.headers.get('x-machine-token');
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: machineId } = await params;
    const token = getMachineFromAuth(request);
    if (!token) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const ds = await getDataSource();
    const machine = await ds.getRepository(Machine).findOne({
      where: { id: machineId, apiToken: token },
    });
    if (!machine) {
      return NextResponse.json({ error: 'Máquina não encontrada' }, { status: 404 });
    }

    machine.lastSeenAt = new Date();
    await ds.getRepository(Machine).save(machine);

    if (machine.status !== MachineStatus.IDLE) {
      return NextResponse.json({ command: null });
    }

    const session = await ds.getRepository(Session).findOne({
      where: {
        machineId,
        status: SessionStatus.PAID,
      },
      order: { createdAt: 'DESC' },
    });

    if (session) {
      return NextResponse.json({ command: 'START_CYCLE', sessionId: session.id });
    }

    return NextResponse.json({ command: null });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: 'Erro ao obter comando' },
      { status: 500 }
    );
  }
}
