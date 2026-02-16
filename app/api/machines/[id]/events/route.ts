import { NextRequest, NextResponse } from 'next/server';
import { getDataSource } from '@/lib/db';
import { Machine, MachineStatus } from '@/lib/entities-all';
import { Session, SessionStatus } from '@/lib/entities-all';
import { In } from 'typeorm';
import { emitSessionEvent } from '@/lib/events';

const VALID_EVENTS = [
  'READY',
  'STARTED',
  'PORTA_ABERTA',
  'PORTA_FECHADA',
  'UV_ON',
  'UV_OFF',
  'FINISHED',
  'ERROR',
];

function getMachineFromAuth(request: NextRequest): string | null {
  const auth = request.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  return request.headers.get('x-machine-token');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: machineId } = await params;
    const token = getMachineFromAuth(request);
    if (!token) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const event = body.event as string;
    const message = (body.message as string) ?? null;

    if (!event || !VALID_EVENTS.includes(event)) {
      return NextResponse.json(
        { error: 'Evento inválido' },
        { status: 400 }
      );
    }

    const ds = await getDataSource();
    const machineRepo = ds.getRepository(Machine);
    const machine = await machineRepo.findOne({
      where: { id: machineId, apiToken: token },
    });
    if (!machine) {
      return NextResponse.json({ error: 'Máquina não encontrada ou token inválido' }, { status: 404 });
    }

    machine.lastSeenAt = new Date();
    await machineRepo.save(machine);

    const sessionRepo = ds.getRepository(Session);
    const activeSession = await sessionRepo.findOne({
      where: {
        machineId,
        status: In([SessionStatus.PAID, SessionStatus.RUNNING]),
      },
      order: { createdAt: 'DESC' },
    });

    if (activeSession) {
      emitSessionEvent(activeSession.id, event, message ? { message } : undefined);
      if (event === 'STARTED') {
        activeSession.status = SessionStatus.RUNNING;
        activeSession.startedAt = new Date();
        await sessionRepo.save(activeSession);
        await machineRepo.update(machineId, { status: MachineStatus.RUNNING });
      } else if (event === 'FINISHED' || event === 'ERROR') {
        activeSession.status = event === 'FINISHED' ? SessionStatus.FINISHED : SessionStatus.ERROR;
        activeSession.finishedAt = new Date();
        await sessionRepo.save(activeSession);
        await machineRepo.update(machineId, { status: MachineStatus.IDLE });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: 'Erro ao registrar evento' },
      { status: 500 }
    );
  }
}
