import { NavLink, useNavigate } from "react-router-dom";

function Sidebar() {
  const navigate = useNavigate();
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark">N</div>
        <span>Personal Notes</span>
      </div>

      <button
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

          <button className="nav-item">
            <span>☆</span>
            Favorites
          </button>
        </div>

        <div className="nav-section">
          <span className="nav-label">Collections</span>

          <button className="nav-item">
            <span className="collection-dot" />
            AI & RAG
          </button>

          <button className="nav-item">
            <span className="collection-dot" />
            Development
          </button>

          <button className="nav-item">
            <span className="collection-dot" />
            Projects
          </button>
        </div>
      </nav>

      <div className="sidebar-bottom">
        <button className="nav-item">
          <span>⚙</span>
          Settings
        </button>

        <div className="user-card">
          <div className="avatar">U</div>

          <div className="user-info">
            <span className="user-name">Your Workspace</span>
            <span className="user-status">Personal</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;