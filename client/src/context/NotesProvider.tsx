import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { notesApi } from "../api";
import type { Note, NoteInput } from "../api";
import { NotesContext } from "./NotesContext";
import type { NotesContextValue } from "./NotesContext";

function sortNotes(notes: Note[]): Note[] {
  return [...notes].sort(
    (left, right) =>
      Date.parse(right.updatedAt) - Date.parse(left.updatedAt)
  );
}

export function NotesProvider({ children }: { children: ReactNode }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadNotes = async () => {
      try {
        const loadedNotes = await notesApi.list();

        if (!cancelled) {
          setNotes(sortNotes(loadedNotes));
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Could not load notes."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadNotes();

    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setNotes(sortNotes(await notesApi.list()));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not load notes."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const createNote = useCallback(async (input: NoteInput) => {
    const created = await notesApi.create(input);
    setNotes((current) => sortNotes([created, ...current]));
    return created;
  }, []);

  const importNote = useCallback(async (file: File) => {
    const imported = await notesApi.importFile(file);
    setNotes((current) => sortNotes([imported, ...current]));
    return imported;
  }, []);

  const updateNote = useCallback(
    async (id: string, input: NoteInput) => {
      const updated = await notesApi.update(id, input);
      setNotes((current) =>
        sortNotes(
          current.map((note) => (note.id === id ? updated : note))
        )
      );
      return updated;
    },
    []
  );

  const deleteNote = useCallback(async (id: string) => {
    await notesApi.remove(id);
    setNotes((current) => current.filter((note) => note.id !== id));
  }, []);

  const value = useMemo<NotesContextValue>(
    () => ({
      notes,
      loading,
      error,
      refresh,
      createNote,
      importNote,
      updateNote,
      deleteNote,
    }),
    [
      notes,
      loading,
      error,
      refresh,
      createNote,
      importNote,
      updateNote,
      deleteNote,
    ]
  );

  return (
    <NotesContext.Provider value={value}>
      {children}
    </NotesContext.Provider>
  );
}
