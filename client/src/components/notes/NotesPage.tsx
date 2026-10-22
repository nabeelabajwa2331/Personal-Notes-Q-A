import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useNotes } from "../../context/NotesContext";
import ImportNoteButton from "./ImportNoteButton";
import NoteEditor from "./NoteEditor";
import NotesList from "./NotesList";

function NotesPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { notes, loading, error, refresh } = useNotes();

  const isNew = location.pathname === "/notes/new";
  const selectedNote = id
    ? notes.find((note) => note.id === id)
    : undefined;

  const pageTitle = isNew
    ? "New Note"
    : selectedNote
      ? "Edit Note"
      : "All Notes";

  return (
    <div className="notes-page">
      <div className="notes-page-header">
        <div>
          <span className="section-eyebrow">YOUR KNOWLEDGE</span>
          <h1>{pageTitle}</h1>
        </div>

        <div className="notes-page-actions">
          <ImportNoteButton />

          {!isNew && (
            <button
              type="button"
              className="new-note-button notes-new-button"
              onClick={() => navigate("/notes/new")}
            >
              <span>+</span>
              New Note
            </button>
          )}
        </div>
      </div>

      <div className="notes-workspace">
        <NotesList
          notes={notes}
          selectedId={selectedNote?.id}
          loading={loading}
          error={error}
          onSelect={(noteId) => navigate(`/notes/${noteId}`)}
          onRetry={() => void refresh()}
        />

        {isNew ? (
          <NoteEditor
            key="new"
            mode="create"
            onSaved={(note) =>
              navigate(`/notes/${note.id}`, { replace: true })
            }
            onDeleted={() => navigate("/notes")}
          />
        ) : id ? (
          loading ? (
            <div className="workspace-empty">
              <p>Loading note...</p>
            </div>
          ) : selectedNote ? (
            <NoteEditor
              key={selectedNote.id}
              mode="edit"
              note={selectedNote}
              onSaved={() => undefined}
              onDeleted={() => navigate("/notes")}
            />
          ) : (
            <div className="workspace-empty">
              <h2>Note not found</h2>
              <p>
                This note may have been deleted, or the link is invalid.
              </p>
              <button
                type="button"
                className="ghost-button"
                onClick={() => navigate("/notes")}
              >
                Back to all notes
              </button>
            </div>
          )
        ) : (
          <div className="workspace-empty">
            <span className="workspace-empty-icon">▤</span>
            <h2>Select a note</h2>
            <p>
              Choose a note from the list, or create a new one to start
              writing.
            </p>
            <button
              type="button"
              className="primary-button"
              onClick={() => navigate("/notes/new")}
            >
              Create a note
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default NotesPage;
