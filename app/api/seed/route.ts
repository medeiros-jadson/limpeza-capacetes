import { NextRequest, NextResponse } from 'next/server';
import { getDataSource } from '@/lib/db';
import { Machine, MachineStatus, CleaningType } from '@/lib/entities-all';

function canRunSeed(request: NextRequest): boolean {
  if (process.env.NODE_ENV !== 'production') return true;
  const secret = process.env.SEED_SECRET;
  if (!secret) return false;
  const header = request.headers.get('x-seed-secret');
  return header === secret;
}

const DEFAULT_CLEANING_TYPES = [
  { name: 'Limpeza Básica', price: 9, durationSeconds: 360 },
  { name: 'Limpeza Padrão', price: 15, durationSeconds: 480 },
  { name: 'Limpeza Profunda', price: 20, durationSeconds: 720 },
];

export async function POST(request: NextRequest) {
  if (!canRunSeed(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const ds = await getDataSource();
    const machineRepo = ds.getRepository(Machine);
    const machineCount = await machineRepo.count();
    let machineId: string | null = null;
    if (machineCount === 0) {
      const machine = machineRepo.create({
        name: 'Máquina 1',
        location: 'Local padrão',
        status: MachineStatus.IDLE,
        ipOrIdentifier: null,
        price: 5,
        apiToken: 'dev-token-máquina-1',
      });
      await machineRepo.save(machine);
      machineId = machine.id;
    }

    const typeRepo = ds.getRepository(CleaningType);
    const typeCount = await typeRepo.count();
    if (typeCount === 0) {
      for (const t of DEFAULT_CLEANING_TYPES) {
        const type = typeRepo.create(t);
        await typeRepo.save(type);
      }
    }

    return NextResponse.json({
      message: 'Seed executado',
      machineId: machineId ?? (machineCount > 0 ? 'já existente' : null),
      cleaningTypesCreated: typeCount === 0 ? DEFAULT_CLEANING_TYPES.length : 0,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao criar seed' }, { status: 500 });
  }
}
