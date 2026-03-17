import { NextRequest, NextResponse } from 'next/server';
import { getDataSource } from '@/lib/db';
import { Session, SessionStatus, Machine, MachineStatus, CleaningType } from '@/lib/entities-all';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const machineId = body.machineId as string | undefined;
    const cleaningTypeId = body.cleaningTypeId as string | undefined;

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

    let price = Math.round(Number(machine.price) * 100);
    let cleaningTypeIdVal: string | null = null;
    let durationSeconds: number | null = null;

    if (cleaningTypeId) {
      const type = await ds.getRepository(CleaningType).findOne({
        where: { id: cleaningTypeId },
      });
      if (type) {
        price = Math.round(Number(type.price) * 100);
        durationSeconds = type.durationSeconds;
        cleaningTypeIdVal = type.id;
      }
    }

    const sessionRepo = ds.getRepository(Session);
    const session = sessionRepo.create({
      machineId: machine.id,
      cleaningTypeId: cleaningTypeIdVal,
      status: SessionStatus.CREATED,
      price,
      durationSeconds,
    });
    await sessionRepo.save(session);

    return NextResponse.json({
      sessionId: session.id,
      machineId: session.machineId,
      price: session.price,
      durationSeconds: session.durationSeconds ?? undefined,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: 'Erro ao criar sessão' },
      { status: 500 }
    );
  }
}
