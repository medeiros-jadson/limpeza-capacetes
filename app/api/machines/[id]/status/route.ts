import { NextRequest, NextResponse } from 'next/server';
import { getDataSource } from '@/lib/db';
import { Machine, MachineStatus } from '@/lib/entities-all';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ds = await getDataSource();
    const machine = await ds.getRepository(Machine).findOne({
      where: { id },
    });
    if (!machine) {
      return NextResponse.json({ error: 'Máquina não encontrada' }, { status: 404 });
    }
    const available = machine.status === MachineStatus.IDLE;
    const offline =
      machine.lastSeenAt
        ? Date.now() - new Date(machine.lastSeenAt).getTime() > 120_000
        : true;
    return NextResponse.json({
      id: machine.id,
      name: machine.name,
      status: machine.status,
      available,
      offline,
      priceCents: machine.priceCents,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: 'Erro ao buscar status' },
      { status: 500 }
    );
  }
}
