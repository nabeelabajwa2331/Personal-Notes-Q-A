import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import type { Note } from "../../api";
import { useNotes } from "../../context/NotesContext";
import { countWords, formatDate } from "../../utils/format";

interface NoteEditorProps {
  mode: "create" | "edit";
  note?: Note;
  onSaved: (note: Note) => void;
  onDeleted: () => void;
}

function NoteEditor({
  mode,
  note,
  onSaved,
  onDeleted,
}: NoteEditorProps) {
  const { createNote, updateNote, deleteNote } = useNotes();
  const navigate = useNavigate();
  const [title, setTitle] = useState(note?.title ?? "");
  const [content, setContent] = useState(note?.content ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);

  const hasChanges =
    mode === "create" || !note
      ? true
      : title !== note.title || content !== note.content;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (status === "saving") {
      return;
    }

    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    setStatus("saving");
    setError(null);

    try {
      if (mode === "create") {
        const created = await createNote({
          title: title.trim(),
          content,
        });
        onSaved(created);
        return;
      }

      if (!note) {
        throw new Error("Note could not be found.");
      }

      const updated = await updateNote(note.id, {
        title: title.trim(),
        content,
      });

      setTitle(updated.title);
      setContent(updated.content);
      setStatus("saved");
      onSaved(updated);
    } catch (saveError) {
      setStatus("idle");
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save the note."
      );
    }
  };

  const handleDelete = async () => {
    if (!note || status === "saving") {
      return;
    }

    const confirmed = window.confirm(
      `Delete "${note.title}"? This cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setStatus("saving");
    setError(null);

    try {
      await deleteNote(note.id);
      onDeleted();
    } catch (deleteError) {
      setStatus("idle");
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete the note."
      );
    }
  };

  const handleAskAi = () => {
    const noteTitle = title.trim() || note?.title;

    if (!noteTitle) {
      return;
    }

    const question = `What are the key points in "${noteTitle}"?`;
    navigate(`/qa?q=${encodeURIComponent(question)}`);
  };

  return (
    <form className="note-editor" onSubmit={handleSubmit}>
      <div className="editor-toolbar">
        <div className="editor-status">
          <span
            className={`save-dot ${status === "saving" ? "saving" : ""}`}
          />
          {status === "saving"
            ? "Saving..."
            : status === "saved"
              ? "Saved"
              : mode === "create"
                ? "New note"
                : hasChanges
                  ? "Unsaved changes"
                  : "Up to date"}
        </div>

        <div className="editor-actions">
          {mode === "edit" && (
            <>
              <button
                type="button"
                className="ghost-button"
                onClick={handleAskAi}
                disabled={status === "saving"}
              >
                Ask AI
              </button>

              <button
                type="button"
                className="danger-button"
                onClick={() => void handleDelete()}
                disabled={status === "saving"}
              >
                Delete
              </button>
            </>
          )}

          <button
            type="submit"
            className="primary-button"
            disabled={
              status === "saving" ||
              (mode === "edit" && !hasChanges)
            }
          >
            {mode === "create" ? "Create note" : "Save"}
          </button>
        </div>
      </div>

      <div className="editor-content">
        <input
          className="note-title-input"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            setStatus("idle");
          }}
          placeholder="Note title"
          aria-label="Note title"
          autoFocus={mode === "create"}
        />

        <div className="note-meta">
          <span>
            {note
              ? `Updated ${formatDate(note.updatedAt)}`
              : "Create a new note"}
          </span>
          <span>{countWords(content)} words</span>
        </div>

        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}

        <textarea
          className="note-content-input"
          value={content}
          onChange={(event) => {
            setContent(event.target.value);
            setStatus("idle");
          }}
          placeholder="Write your note here..."
          aria-label="Note content"
        />
      </div>
    </form>
  );
}

export default NoteEditor;
