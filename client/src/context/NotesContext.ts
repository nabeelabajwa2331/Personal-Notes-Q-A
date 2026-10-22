import { createContext, useContext } from "react";
import type { Note, NoteInput } from "../api";

export interface NotesContextValue {
  notes: Note[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createNote: (input: NoteInput) => Promise<Note>;
  importNote: (file: File) => Promise<Note>;
  updateNote: (id: string, input: NoteInput) => Promise<Note>;
  deleteNote: (id: string) => Promise<void>;
}

export const NotesContext = createContext<NotesContextValue | null>(
  null
);

export function useNotes(): NotesContextValue {
  const context = useContext(NotesContext);

  if (!context) {
    throw new Error("useNotes must be used inside NotesProvider.");
  }

  return context;
}
