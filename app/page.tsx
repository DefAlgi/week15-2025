'use client';

import { useState, useEffect, FormEvent } from 'react';

interface Note {
  id: number;
  title: string;
  content: string;
  createdAt: string;
}

export default function Home() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchNotes = async () => {
    try {
      setErrorMsg('');
      const res = await fetch('/api/notes', { cache: 'no-store' });
      const text = await res.text();

      if (!text) {
        setErrorMsg(`Respon kosong dari server (Status: ${res.status})`);
        return;
      }

      const data = JSON.parse(text);
      if (!res.ok) {
        setErrorMsg(data.error || `Gagal mengambil data (Status: ${res.status})`);
        return;
      }

      if (Array.isArray(data)) {
        setNotes(data);
      }
    } catch (err) {
      setErrorMsg('Gagal memproses data dari /api/notes');
      console.error(err);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;
    setLoading(true);
    setErrorMsg('');

    try {
      const url = editId ? `/api/notes/${editId}` : '/api/notes';
      const method = editId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};

      if (!res.ok) {
        setErrorMsg(data.error || 'Operasi gagal (Di Vercel, SQLite bersifat read-only)');
      } else {
        setTitle('');
        setContent('');
        setEditId(null);
        await fetchNotes();
      }
    } catch (err) {
      setErrorMsg('Terjadi kesalahan jaringan');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (note: Note) => {
    setEditId(note.id);
    setTitle(note.title);
    setContent(note.content);
  };

  const handleDelete = async (id: number) => {
    try {
      setErrorMsg('');
      const res = await fetch(`/api/notes/${id}`, { method: 'DELETE' });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};

      if (!res.ok) {
        setErrorMsg(data.error || 'Gagal menghapus (Di Vercel, SQLite bersifat read-only)');
      } else {
        await fetchNotes();
      }
    } catch (err) {
      setErrorMsg('Gagal menghapus data');
      console.error(err);
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 py-10 px-4 text-gray-800">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-6">
          Aplikasi Catatan (Next.js + Prisma + SQLite)
        </h1>

        {errorMsg && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md mb-8 space-y-4">
          <h2 className="text-xl font-semibold">
            {editId ? 'Edit Catatan' : 'Tambah Catatan Baru'}
          </h2>
          <div>
            <label className="block text-sm font-medium mb-1">Judul</label>
            <input
              type="text"
              placeholder="Masukkan judul..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Isi Catatan</label>
            <textarea
              placeholder="Tulis catatan di sini..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 h-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
            >
              {loading ? 'Menyimpan...' : editId ? 'Update Data' : 'Simpan Data'}
            </button>
            {editId && (
              <button
                type="button"
                onClick={() => {
                  setEditId(null);
                  setTitle('');
                  setContent('');
                }}
                className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500 transition"
              >
                Batal
              </button>
            )}
          </div>
        </form>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Daftar Catatan ({notes.length})</h2>
          {notes.length === 0 ? (
            <p className="text-gray-500 bg-white p-4 rounded shadow">Belum ada data catatan.</p>
          ) : (
            notes.map((note) => (
              <div key={note.id} className="bg-white p-5 rounded-lg shadow flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg">{note.title}</h3>
                  <p className="text-gray-600 mt-1">{note.content}</p>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleEdit(note)}
                    className="bg-yellow-500 text-white px-3 py-1 rounded text-sm hover:bg-yellow-600"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}