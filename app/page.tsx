'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import styles from './page.module.css';
import { NOTE_CONTENT_MAX_LENGTH, NOTE_TITLE_MAX_LENGTH } from '@/lib/notes';

type Note = {
  id: number;
  title: string;
  content: string;
  createdAt: string;
};

function isNote(value: unknown): value is Note {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const note = value as Record<string, unknown>;
  return (
    typeof note.id === 'number' &&
    typeof note.title === 'string' &&
    typeof note.content === 'string' &&
    typeof note.createdAt === 'string'
  );
}

async function readJson(response: Response): Promise<unknown> {
  return response.json().catch(() => null);
}

function getErrorMessage(value: unknown, fallback: string) {
  if (
    typeof value === 'object' &&
    value !== null &&
    'error' in value &&
    typeof value.error === 'string'
  ) {
    return value.error;
  }

  return fallback;
}

async function fetchNotes(signal?: AbortSignal): Promise<Note[]> {
  const response = await fetch('/api/notes', {
    cache: 'no-store',
    signal,
  });
  const result = await readJson(response);

  if (!response.ok) {
    throw new Error(getErrorMessage(result, 'Catatan gagal dimuat.'));
  }

  if (!Array.isArray(result) || !result.every(isNote)) {
    throw new Error('Server mengirim data catatan dengan format yang tidak valid.');
  }

  return result;
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Waktu tidak tersedia';
  }

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export default function Home() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [search, setSearch] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadInitialNotes() {
      try {
        const result = await fetchNotes(controller.signal);
        if (!controller.signal.aborted) {
          setNotes(result);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setErrorMessage(
            error instanceof Error ? error.message : 'Catatan gagal dimuat.'
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialNotes();
    return () => controller.abort();
  }, []);

  const filteredNotes = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('id-ID');
    if (!query) {
      return notes;
    }

    return notes.filter(
      (note) =>
        note.title.toLocaleLowerCase('id-ID').includes(query) ||
        note.content.toLocaleLowerCase('id-ID').includes(query)
    );
  }, [notes, search]);

  async function handleRefresh() {
    setIsRefreshing(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      setNotes(await fetchNotes());
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Catatan gagal dimuat.'
      );
    } finally {
      setIsRefreshing(false);
    }
  }

  function resetForm() {
    setTitle('');
    setContent('');
    setEditId(null);
    setFormError('');
  }

  function handleCancelEdit() {
    resetForm();
    setErrorMessage('');
    setSuccessMessage('');
  }

  function handleEdit(note: Note) {
    setEditId(note.id);
    setTitle(note.title);
    setContent(note.content);
    setFormError('');
    setErrorMessage('');
    setSuccessMessage('');
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    titleRef.current?.focus({ preventScroll: true });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');
    setErrorMessage('');
    setSuccessMessage('');

    const normalizedTitle = title.trim();
    const normalizedContent = content.trim();

    if (!normalizedTitle || !normalizedContent) {
      setFormError('Judul dan isi catatan wajib diisi.');
      return;
    }

    if (normalizedTitle.length > NOTE_TITLE_MAX_LENGTH) {
      setFormError(`Judul maksimal ${NOTE_TITLE_MAX_LENGTH} karakter.`);
      return;
    }

    if (normalizedContent.length > NOTE_CONTENT_MAX_LENGTH) {
      setFormError(`Isi catatan maksimal ${NOTE_CONTENT_MAX_LENGTH} karakter.`);
      return;
    }

    setIsSaving(true);

    try {
      const isEditing = editId !== null;
      const response = await fetch(
        isEditing ? `/api/notes/${editId}` : '/api/notes',
        {
          method: isEditing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: normalizedTitle,
            content: normalizedContent,
          }),
        }
      );
      const result = await readJson(response);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(result, 'Catatan gagal disimpan. Coba lagi.')
        );
      }

      if (!isNote(result)) {
        throw new Error('Server mengirim respons catatan yang tidak valid.');
      }

      setNotes((currentNotes) => {
        const nextNotes = isEditing
          ? currentNotes.map((note) => (note.id === result.id ? result : note))
          : [result, ...currentNotes];

        return nextNotes.sort(
          (first, second) =>
            new Date(second.createdAt).getTime() -
            new Date(first.createdAt).getTime()
        );
      });
      resetForm();
      setSuccessMessage(
        isEditing ? 'Perubahan catatan berhasil disimpan.' : 'Catatan berhasil ditambahkan.'
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Catatan gagal disimpan.'
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(note: Note) {
    if (!window.confirm(`Hapus catatan "${note.title}"? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }

    setDeletingId(note.id);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await fetch(`/api/notes/${note.id}`, {
        method: 'DELETE',
      });
      const result = await readJson(response);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(result, 'Catatan gagal dihapus. Coba lagi.')
        );
      }

      setNotes((currentNotes) =>
        currentNotes.filter((currentNote) => currentNote.id !== note.id)
      );
      if (editId === note.id) {
        resetForm();
      }
      setSuccessMessage('Catatan berhasil dihapus.');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Catatan gagal dihapus.'
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <Link className={styles.brand} href="/" aria-label="Nota, beranda">
            <span className={styles.brandMark} aria-hidden="true">N</span>
            <span>nota</span>
          </Link>
          <span className={styles.headerCaption}>RUANG KECIL UNTUK IDE BESAR</span>
        </header>

        <section className={styles.intro}>
          <div>
            <p className={styles.eyebrow}>CATATAN PRIBADI</p>
            <h1>Semua yang penting,<br />tersimpan di sini.</h1>
            <p className={styles.subtitle}>
              Tulis ide, simpan rencana, dan kembali kapan saja.
            </p>
          </div>
          <div className={styles.noteCount} aria-label={`${notes.length} catatan`}>
            <span className={styles.noteCountValue}>{notes.length}</span>
            <span>{notes.length === 1 ? 'catatan' : 'catatan tersimpan'}</span>
          </div>
        </section>

        {errorMessage && (
          <div className={styles.alert} role="alert">
            <span>{errorMessage}</span>
            <button
              className={styles.alertClose}
              type="button"
              onClick={() => setErrorMessage('')}
              aria-label="Tutup pesan kesalahan"
            >
              ×
            </button>
          </div>
        )}
        {successMessage && (
          <div className={styles.success} role="status">
            {successMessage}
          </div>
        )}

        <div className={styles.workspace}>
          <section className={styles.composer} aria-labelledby="composer-title">
            <div className={styles.sectionHeading}>
              <span className={styles.sectionNumber}>01</span>
              <div>
                <h2 id="composer-title">
                  {editId === null ? 'Catatan baru' : 'Edit catatan'}
                </h2>
                <p>
                  {editId === null
                    ? 'Jangan biarkan ide bagus lewat begitu saja.'
                    : 'Perbarui isi catatanmu.'}
                </p>
              </div>
            </div>

            <form ref={formRef} onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.field}>
                <label htmlFor="note-title">Judul</label>
                <input
                  ref={titleRef}
                  id="note-title"
                  name="title"
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Contoh: Ide untuk akhir pekan"
                  maxLength={NOTE_TITLE_MAX_LENGTH}
                  autoComplete="off"
                  required
                />
                <span className={styles.characterCount}>
                  {title.length}/{NOTE_TITLE_MAX_LENGTH}
                </span>
              </div>

              <div className={styles.field}>
                <label htmlFor="note-content">Isi catatan</label>
                <textarea
                  id="note-content"
                  name="content"
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="Mulai tulis di sini..."
                  maxLength={NOTE_CONTENT_MAX_LENGTH}
                  rows={7}
                  required
                />
                <span className={styles.characterCount}>
                  {content.length}/{NOTE_CONTENT_MAX_LENGTH}
                </span>
              </div>

              {formError && (
                <p className={styles.formError} role="alert">{formError}</p>
              )}

              <div className={styles.formActions}>
                <button
                  className={styles.primaryButton}
                  type="submit"
                  disabled={isSaving || deletingId !== null}
                >
                  {isSaving
                    ? 'Menyimpan...'
                    : editId === null
                      ? 'Simpan catatan'
                      : 'Simpan perubahan'}
                  {!isSaving && <span aria-hidden="true">↗</span>}
                </button>
                {editId !== null && (
                  <button
                    className={styles.secondaryButton}
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                  >
                    Batal
                  </button>
                )}
              </div>
            </form>
          </section>

          <section className={styles.notesSection} aria-labelledby="notes-title">
            <div className={styles.notesHeader}>
              <div className={styles.sectionHeading}>
                <span className={styles.sectionNumber}>02</span>
                <div>
                  <h2 id="notes-title">Catatanmu</h2>
                  <p>{notes.length === 0 ? 'Koleksi masih kosong.' : 'Ide-ide yang sudah kamu simpan.'}</p>
                </div>
              </div>
              <button
                className={styles.refreshButton}
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing || isLoading}
              >
                <span aria-hidden="true" className={isRefreshing ? styles.spinning : ''}>↻</span>
                {isRefreshing ? 'Memuat' : 'Segarkan'}
              </button>
            </div>

            <div className={styles.searchBox}>
              <label className={styles.visuallyHidden} htmlFor="note-search">
                Cari catatan
              </label>
              <span className={styles.searchIcon} aria-hidden="true" />
              <input
                id="note-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari judul atau isi catatan..."
              />
              {search && (
                <button
                  className={styles.clearSearch}
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label="Hapus pencarian"
                >
                  ×
                </button>
              )}
            </div>

            <div className={styles.noteList} aria-live="polite">
              {isLoading ? (
                <div className={styles.loadingState} role="status">
                  <span className={styles.spinner} />
                  <span>Memuat catatan...</span>
                </div>
              ) : filteredNotes.length > 0 ? (
                filteredNotes.map((note, index) => (
                  <article className={styles.noteCard} key={note.id}>
                    <div className={styles.noteCardTop}>
                      <span className={styles.noteIndex}>
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <time className={styles.noteDate} dateTime={note.createdAt}>
                        {formatDate(note.createdAt)}
                      </time>
                    </div>
                    <h3>{note.title}</h3>
                    <p className={styles.noteContent}>{note.content}</p>
                    <div className={styles.noteActions}>
                      <button
                        className={styles.editButton}
                        type="button"
                        onClick={() => handleEdit(note)}
                        disabled={isSaving || deletingId !== null}
                      >
                        Edit
                      </button>
                      <button
                        className={styles.deleteButton}
                        type="button"
                        onClick={() => void handleDelete(note)}
                        disabled={isSaving || deletingId !== null}
                      >
                        {deletingId === note.id ? 'Menghapus...' : 'Hapus'}
                      </button>
                    </div>
                  </article>
                ))
              ) : search ? (
                <div className={styles.emptyState}>
                  <span className={styles.emptyMark} aria-hidden="true">?</span>
                  <h3>Belum ada yang cocok</h3>
                  <p>Coba kata kunci lain atau hapus pencarian.</p>
                  <button
                    className={styles.textButton}
                    type="button"
                    onClick={() => setSearch('')}
                  >
                    Hapus pencarian
                  </button>
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <span className={styles.emptyMark} aria-hidden="true">N</span>
                  <h3>Mulai dari satu ide</h3>
                  <p>Catatan pertamamu menunggu untuk ditulis.</p>
                </div>
              )}
            </div>
          </section>
        </div>

        <footer className={styles.footer}>
          <span>NOTA</span>
          <span>Pelan-pelan, satu catatan dalam satu waktu.</span>
        </footer>
      </div>
    </main>
  );
}
