import { NavLink, useNavigate } from "react-router-dom";
import { useNotes } from "../../context/NotesContext";

function Sidebar() {
  const { notes } = useNotes();
  const navigate = useNavigate();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark">N</div>
        <span>Personal Notes</span>
      </div>

      <button
        type="button"
        className="new-note-button"
        onClick={() => navigate("/notes/new")}
      >
        <span>+</span>
        New Note
      </button>

      <nav className="sidebar-nav">
        <div className="nav-section">
          <span className="nav-label">Workspace</span>

          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `nav-item ${isActive ? "active" : ""}`
            }
          >
            <span>⌂</span>
            Dashboard
          </NavLink>

          <NavLink
            to="/notes"
            end
            className={({ isActive }) =>
              `nav-item ${isActive ? "active" : ""}`
            }
          >
            <span>▤</span>
            All Notes
          </NavLink>

          <NavLink
            to="/qa"
            className={({ isActive }) =>
              `nav-item ${isActive ? "active" : ""}`
            }
          >
            <span>✦</span>
            Ask AI
          </NavLink>
        </div>

        <div className="nav-section">
          <span className="nav-label">Recent</span>

          {notes.length === 0 ? (
            <span className="nav-empty">No notes yet</span>
          ) : (
            notes.slice(0, 4).map((note) => (
              <NavLink
                key={note.id}
                to={`/notes/${note.id}`}
                className={({ isActive }) =>
                  `nav-item ${isActive ? "active" : ""}`
                }
              >
                <span className="collection-dot" />
                <span className="nav-note-title">{note.title}</span>
              </NavLink>
            ))
          )}
        </div>
      </nav>

      <div className="sidebar-bottom">
        <div className="user-card">
          <div className="avatar">U</div>

          <div className="user-info">
            <span className="user-name">Your Workspace</span>
            <span className="user-status">
              {notes.length} {notes.length === 1 ? "note" : "notes"}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
