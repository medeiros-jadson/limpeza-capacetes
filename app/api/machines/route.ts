import { NextResponse } from 'next/server';
import { getDataSource } from '@/lib/db';
import { Machine } from '@/lib/entities-all';

export async function GET() {
  try {
    const ds = await getDataSource();
    const machines = await ds.getRepository(Machine).find({
      order: { name: 'ASC' },
    });
    return NextResponse.json(
      machines.map((m) => ({
        id: m.id,
        name: m.name,
        location: m.location,
        status: m.status,
        priceCents: m.priceCents,
        lastSeenAt: m.lastSeenAt,
      }))
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: 'Erro ao listar máquinas' },
      { status: 500 }
    );
  }
}
