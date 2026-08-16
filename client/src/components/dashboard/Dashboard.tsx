
const recentNotes = [
  {
    title: "RAG Fundamentals",
    description: "Understanding retrieval augmented generation and semantic search.",
    category: "AI & RAG",
    updated: "Today",
  },
  {
    title: "Docker Networking",
    description: "Containers, bridge networks, host networks and communication.",
    category: "Development",
    updated: "Yesterday",
  },
  {
    title: "React Hooks",
    description: "useState, useEffect and patterns for managing component state.",
    category: "Development",
    updated: "2 days ago",
  },
];
import { useNavigate } from "react-router-dom";

function Dashboard() {
  const navigate = useNavigate();
  return (
    <div className="dashboard">
      <section className="ai-query-section">
        <div className="query-header">
          <div>
            <span className="query-icon">✦</span>

            <span className="query-label">
              ASK YOUR KNOWLEDGE
            </span>
          </div>
        </div>

        <div className="query-box">
          <input
            type="text"
            placeholder="Ask anything about your notes..."
          />

          <button
            className="query-submit"
            onClick={() => navigate("/qa")}
          >
            →
          </button>
        </div>

        <div className="query-hint">
          <span>Try asking</span>

          <button>
            "What did I learn about RAG?"
          </button>

          <button>
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

          <button className="view-all-button">
            View all →
          </button>
        </div>

        <div className="notes-grid">
          {recentNotes.map((note) => (
            <article className="note-card" key={note.title}>
              <div className="note-card-top">
                <span className="note-category">
                  {note.category}
                </span>

                <button className="note-menu">
                  ···
                </button>
              </div>

              <h3>{note.title}</h3>

              <p>{note.description}</p>

              <div className="note-card-footer">
                <span>{note.updated}</span>
                <span>↗</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="stats-section">
        <div className="stat-card">
          <span className="stat-number">12</span>
          <span className="stat-label">Notes</span>
        </div>

        <div className="stat-card">
          <span className="stat-number">48</span>
          <span className="stat-label">Knowledge chunks</span>
        </div>

        <div className="stat-card stat-card-featured">
          <div>
            <span className="stat-eyebrow">RAG ASSISTANT</span>
            <span className="stat-featured-title">
              Ask your notes anything.
            </span>
          </div>

          <span className="stat-arrow">→</span>
        </div>
      </section>
    </div>
  );
}

export default Dashboard;