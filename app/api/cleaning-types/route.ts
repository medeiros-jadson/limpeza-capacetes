import { NextRequest, NextResponse } from 'next/server';
import { getDataSource } from '@/lib/db';
import { CleaningType } from '@/lib/entities-all';

export async function GET() {
  try {
    const ds = await getDataSource();
    const list = await ds.getRepository(CleaningType).find({
      order: { durationSeconds: 'ASC' },
    });
    return NextResponse.json(
      list.map((t) => ({
        id: t.id,
        name: t.name,
        price: Number(t.price),
        durationSeconds: t.durationSeconds,
      }))
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: 'Erro ao listar tipos de limpeza' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = (body.name as string)?.trim();
    const durationSeconds = typeof body.durationSeconds === 'number' ? body.durationSeconds : undefined;

    let price: number;
    if (typeof body.priceReais === 'number') {
      price = body.priceReais;
    } else if (typeof body.price === 'number') {
      price = body.price;
    } else {
      price = NaN;
    }

    if (!name || name.length === 0) {
      return NextResponse.json(
        { error: 'Nome é obrigatório' },
        { status: 400 }
      );
    }
    if (isNaN(price) || price < 0) {
      return NextResponse.json(
        { error: 'Valor deve ser um número em reais (ex.: 2.60 ou 0.60)' },
        { status: 400 }
      );
    }
    if (durationSeconds === undefined || durationSeconds <= 0) {
      return NextResponse.json(
        { error: 'Duração (durationSeconds) deve ser um número > 0' },
        { status: 400 }
      );
    }

    const ds = await getDataSource();
    const repo = ds.getRepository(CleaningType);
    const type = repo.create({ name, price, durationSeconds });
    await repo.save(type);
    return NextResponse.json({
      id: type.id,
      name: type.name,
      price: Number(type.price),
      durationSeconds: type.durationSeconds,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: 'Erro ao criar tipo de limpeza' },
      { status: 500 }
    );
  }
}
