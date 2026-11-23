export const NOTE_TITLE_MAX_LENGTH = 100;
export const NOTE_CONTENT_MAX_LENGTH = 5000;

export type NoteInput = {
  title: string;
  content: string;
};

type NoteInputResult =
  | { success: true; data: NoteInput }
  | { success: false; error: string };

export function validateNoteInput(value: unknown): NoteInputResult {
  if (typeof value !== 'object' || value === null) {
    return { success: false, error: 'Format data catatan tidak valid.' };
  }

  const input = value as Record<string, unknown>;

  if (typeof input.title !== 'string' || typeof input.content !== 'string') {
    return { success: false, error: 'Judul dan isi catatan wajib berupa teks.' };
  }

  const title = input.title.trim();
  const content = input.content.trim();

  if (!title || !content) {
    return { success: false, error: 'Judul dan isi catatan wajib diisi.' };
  }

  if (title.length > NOTE_TITLE_MAX_LENGTH) {
    return {
      success: false,
      error: `Judul maksimal ${NOTE_TITLE_MAX_LENGTH} karakter.`,
    };
  }

  if (content.length > NOTE_CONTENT_MAX_LENGTH) {
    return {
      success: false,
      error: `Isi catatan maksimal ${NOTE_CONTENT_MAX_LENGTH} karakter.`,
    };
  }

  return { success: true, data: { title, content } };
}

export function parseNoteId(value: string): number | null {
  if (!/^[1-9]\d*$/.test(value)) {
    return null;
  }

  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}
