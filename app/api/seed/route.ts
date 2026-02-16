import { NextRequest, NextResponse } from 'next/server';
import { getDataSource } from '@/lib/db';
import { Machine, MachineStatus } from '@/lib/entities-all';

function canRunSeed(request: NextRequest): boolean {
  if (process.env.NODE_ENV !== 'production') return true;
  const secret = process.env.SEED_SECRET;
  if (!secret) return false;
  const header = request.headers.get('x-seed-secret');
  return header === secret;
}

export async function POST(request: NextRequest) {
  if (!canRunSeed(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const ds = await getDataSource();
    const repo = ds.getRepository(Machine);
    const count = await repo.count();
    if (count > 0) {
      return NextResponse.json({ message: 'Já existem máquinas', count });
    }
    const machine = repo.create({
      name: 'Máquina 1',
      location: 'Local padrão',
      status: MachineStatus.IDLE,
      ipOrIdentifier: null,
      priceCents: 500,
      apiToken: 'dev-token-máquina-1',
    });
    await repo.save(machine);
    return NextResponse.json({ message: 'Máquina criada', machineId: machine.id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao criar seed' }, { status: 500 });
  }
}
