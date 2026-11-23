import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const notes = await prisma.note.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(notes, { status: 200 });
  } catch (error) {
    console.error('GET /api/notes error:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil data', details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Judul dan isi catatan wajib diisi' },
        { status: 400 }
      );
    }

    const newNote = await prisma.note.create({
      data: { title, content },
    });
    return NextResponse.json(newNote, { status: 201 });
  } catch (error) {
    console.error('POST /api/notes error:', error);
    return NextResponse.json(
      { error: 'Gagal membuat data', details: String(error) },
      { status: 500 }
    );
  }
}