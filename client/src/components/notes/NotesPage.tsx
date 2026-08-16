import NotesList from "./NotesList";
import NoteEditor from "./NoteEditor";

function NotesPage() {
  return (
    <div className="notes-page">
      <div className="notes-page-header">
        <div>
          <span className="section-eyebrow">YOUR KNOWLEDGE</span>
          <h1>All Notes</h1>
        </div>

        <button className="new-note-button notes-new-button">
          <span>+</span>
          New Note
        </button>
      </div>

      <div className="notes-workspace">
        <NotesList />
        <NoteEditor />
      </div>
    </div>
  );
}

export default NotesPage;