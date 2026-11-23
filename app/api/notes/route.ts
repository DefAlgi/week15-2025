import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateNoteInput } from '@/lib/notes';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const notes = await prisma.note.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(notes, { status: 200 });
  } catch (error) {
    console.error('GET /api/notes error:', error);
    return NextResponse.json(
      { error: 'Catatan gagal dimuat. Coba lagi sebentar.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json().catch(() => null);
    const result = validateNoteInput(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    const newNote = await prisma.note.create({
      data: result.data,
    });
    return NextResponse.json(newNote, { status: 201 });
  } catch (error) {
    console.error('POST /api/notes error:', error);
    return NextResponse.json(
      { error: 'Catatan gagal disimpan. Coba lagi sebentar.' },
      { status: 500 }
    );
  }
}