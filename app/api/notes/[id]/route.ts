import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { parseNoteId, validateNoteInput } from '@/lib/notes';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ id: string }>;
};

function isRecordNotFound(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2025'
  );
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const numericId = parseNoteId(id);

  if (numericId === null) {
    return NextResponse.json({ error: 'ID catatan tidak valid.' }, { status: 400 });
  }

  try {
    const body: unknown = await request.json().catch(() => null);
    const result = validateNoteInput(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const updatedNote = await prisma.note.update({
      where: { id: numericId },
      data: result.data,
    });
    return NextResponse.json(updatedNote, { status: 200 });
  } catch (error) {
    if (isRecordNotFound(error)) {
      return NextResponse.json({ error: 'Catatan tidak ditemukan.' }, { status: 404 });
    }

    console.error('PUT /api/notes/[id] error:', error);
    return NextResponse.json(
      { error: 'Catatan gagal diperbarui. Coba lagi sebentar.' },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const numericId = parseNoteId(id);

  if (numericId === null) {
    return NextResponse.json({ error: 'ID catatan tidak valid.' }, { status: 400 });
  }

  try {
    await prisma.note.delete({
      where: { id: numericId },
    });
    return NextResponse.json({ message: 'Catatan berhasil dihapus.' });
  } catch (error) {
    if (isRecordNotFound(error)) {
      return NextResponse.json({ error: 'Catatan tidak ditemukan.' }, { status: 404 });
    }

    console.error('DELETE /api/notes/[id] error:', error);
    return NextResponse.json(
      { error: 'Catatan gagal dihapus. Coba lagi sebentar.' },
      { status: 500 }
    );
  }
}