import { NextRequest, NextResponse } from 'next/server';
import { getDataSource } from '@/lib/db';
import { Session, SessionStatus } from '@/lib/entities-all';
import { Machine, MachineStatus } from '@/lib/entities-all';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const machineId = body.machineId as string | undefined;

    const ds = await getDataSource();
    const machineRepo = ds.getRepository(Machine);

    let machine = null;
    if (machineId) {
      machine = await machineRepo.findOne({ where: { id: machineId } });
      if (!machine) {
        return NextResponse.json(
          { error: 'Máquina não encontrada' },
          { status: 404 }
        );
      }
    } else {
      machine = await machineRepo.findOne({
        where: { status: MachineStatus.IDLE },
        order: { lastSeenAt: 'DESC' },
      });
      if (!machine) {
        return NextResponse.json(
          { error: 'Nenhuma máquina disponível' },
          { status: 503 }
        );
      }
    }

    const sessionRepo = ds.getRepository(Session);
    const session = sessionRepo.create({
      machineId: machine.id,
      status: SessionStatus.CREATED,
      price: machine.priceCents,
    });
    await sessionRepo.save(session);

    return NextResponse.json({
      sessionId: session.id,
      machineId: session.machineId,
      price: session.price,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: 'Erro ao criar sessão' },
      { status: 500 }
    );
  }
}
