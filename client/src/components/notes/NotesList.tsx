import type { Note } from "../../api";
import { formatDate, snippet } from "../../utils/format";

interface NotesListProps {
  notes: Note[];
  selectedId?: string;
  loading: boolean;
  error: string | null;
  onSelect: (noteId: string) => void;
  onRetry: () => void;
}

function NotesList({
  notes,
  selectedId,
  loading,
  error,
  onSelect,
  onRetry,
}: NotesListProps) {
  return (
    <div className="notes-list">
      <div className="notes-list-header">
        <span>Notes</span>
        <span>{loading ? "…" : notes.length}</span>
      </div>

      <div className="notes-list-items">
        {error ? (
          <div className="notes-list-status">
            <p>{error}</p>
            <button
              type="button"
              className="ghost-button"
              onClick={onRetry}
            >
              Retry
            </button>
          </div>
        ) : loading ? (
          <p className="notes-list-status">Loading notes...</p>
        ) : notes.length === 0 ? (
          <p className="notes-list-status">
            No notes yet. Create your first note.
          </p>
        ) : (
          notes.map((note) => {
            const isSelected = note.id === selectedId;

            return (
              <button
                type="button"
                key={note.id}
                className={`notes-list-item ${
                  isSelected ? "selected" : ""
                }`}
                onClick={() => onSelect(note.id)}
                aria-current={isSelected ? "page" : undefined}
              >
                <div className="notes-list-item-top">
                  <span className="notes-list-category">Note</span>
                  <span className="notes-list-date">
                    {formatDate(note.updatedAt)}
                  </span>
                </div>

                <h3>{note.title}</h3>

                <p>{snippet(note.content, 100)}</p>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

export default NotesList;
