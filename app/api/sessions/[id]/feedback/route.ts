import { NextRequest, NextResponse } from 'next/server';
import { getDataSource } from '@/lib/db';
import { Session } from '@/lib/entities-all';
import { Feedback } from '@/lib/entities-all';

const VALID_EMOTIONS = ['excelente', 'bom', 'regular', 'ruim'];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const body = await request.json();
    const emotion = (body.emotion as string)?.toLowerCase();

    if (!emotion || !VALID_EMOTIONS.includes(emotion)) {
      return NextResponse.json(
        { error: 'Emoção inválida. Use: excelente, bom, regular, ruim' },
        { status: 400 }
      );
    }

    const ds = await getDataSource();
    const session = await ds.getRepository(Session).findOne({
      where: { id: sessionId },
    });
    if (!session) {
      return NextResponse.json({ error: 'Sessão não encontrada' }, { status: 404 });
    }

    const feedbackRepo = ds.getRepository(Feedback);
    let feedback = await feedbackRepo.findOne({ where: { sessionId } });
    if (feedback) {
      feedback.emotion = emotion;
      await feedbackRepo.save(feedback);
    } else {
      feedback = feedbackRepo.create({ sessionId, emotion });
      await feedbackRepo.save(feedback);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: 'Erro ao salvar feedback' },
      { status: 500 }
    );
  }
}
