import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import ImportNoteButton from "../notes/ImportNoteButton";
import { useNotes } from "../../context/NotesContext";
import { countWords, formatDate, snippet } from "../../utils/format";

function Dashboard() {
  const { notes, loading, error, refresh } = useNotes();
  const navigate = useNavigate();
  const [question, setQuestion] = useState("");

  const recentNotes = notes.slice(0, 3);
  const totalWords = notes.reduce(
    (total, note) => total + countWords(note.content),
    0
  );

  const askQuestion = (value: string) => {
    const normalized = value.trim();

    if (!normalized) {
      return;
    }

    navigate(`/qa?q=${encodeURIComponent(normalized)}`);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    askQuestion(question);
  };

  return (
    <div className="dashboard">
      <section className="ai-query-section">
        <div className="query-header">
          <div>
            <span className="query-icon">✦</span>

            <span className="query-label">ASK YOUR KNOWLEDGE</span>
          </div>
        </div>

        <form className="query-box" onSubmit={handleSubmit}>
          <input
            type="text"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask anything about your notes..."
            aria-label="Ask a question about your notes"
          />

          <button
            type="submit"
            className="query-submit"
            aria-label="Ask question"
          >
            →
          </button>
        </form>

        <div className="query-hint">
          <span>Try asking</span>

          <button
            type="button"
            onClick={() => askQuestion("What did I learn about RAG?")}
          >
            "What did I learn about RAG?"
          </button>

          <button
            type="button"
            onClick={() => askQuestion("Summarize my Docker notes")}
          >
            "Summarize my Docker notes"
          </button>
        </div>
      </section>

      <section className="notes-section">
        <div className="section-header">
          <div>
            <span className="section-eyebrow">YOUR KNOWLEDGE</span>
            <h2>Recent notes</h2>
          </div>

          <button
            type="button"
            className="view-all-button"
            onClick={() => navigate("/notes")}
          >
            View all →
          </button>
        </div>

        {error ? (
          <div className="status-panel error-panel">
            <p>{error}</p>
            <button
              type="button"
              className="ghost-button"
              onClick={() => void refresh()}
            >
              Retry
            </button>
          </div>
        ) : loading ? (
          <div className="status-panel">Loading notes...</div>
        ) : recentNotes.length === 0 ? (
          <div className="empty-panel">
            <h3>No notes yet</h3>
            <p>
              Create your first note or import a PDF/DOCX, then ask
              questions about it with Notes AI.
            </p>

            <div className="empty-panel-actions">
              <Link to="/notes/new" className="primary-button">
                Create a note
              </Link>
              <ImportNoteButton />
            </div>
          </div>
        ) : (
          <div className="notes-grid">
            {recentNotes.map((note) => (
              <Link
                className="note-card"
                key={note.id}
                to={`/notes/${note.id}`}
              >
                <div className="note-card-top">
                  <span className="note-category">Note</span>
                </div>

                <h3>{note.title}</h3>

                <p>{snippet(note.content, 140)}</p>

                <div className="note-card-footer">
                  <span>{formatDate(note.updatedAt)}</span>
                  <span>↗</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="stats-section">
        <div className="stat-card">
          <span className="stat-number">
            {loading ? "—" : notes.length}
          </span>
          <span className="stat-label">
            {notes.length === 1 ? "Note" : "Notes"}
          </span>
        </div>

        <div className="stat-card">
          <span className="stat-number">
            {loading ? "—" : totalWords}
          </span>
          <span className="stat-label">Words</span>
        </div>

        <Link to="/qa" className="stat-card stat-card-featured">
          <div>
            <span className="stat-eyebrow">RAG ASSISTANT</span>
            <span className="stat-featured-title">
              Ask your notes anything.
            </span>
          </div>

          <span className="stat-arrow">→</span>
        </Link>
      </section>
    </div>
  );
}

export default Dashboard;
