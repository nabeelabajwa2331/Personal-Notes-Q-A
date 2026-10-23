import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { backupApi } from "../../api";
import { useAuth } from "../../context/AuthContext";
import { useNotes } from "../../context/NotesContext";

type BackupState = "idle" | "working" | "success" | "error";

function Sidebar() {
  const { notes } = useNotes();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [backupState, setBackupState] =
    useState<BackupState>("idle");
  const [backupMessage, setBackupMessage] = useState<string | null>(
    null
  );

  const handleBackup = async () => {
    setBackupState("working");
    setBackupMessage(null);

    try {
      const { blob, filename } = await backupApi.download();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);

      setBackupState("success");
      setBackupMessage("Encrypted backup downloaded.");
    } catch (error) {
      setBackupState("error");
      setBackupMessage(
        error instanceof Error
          ? error.message
          : "Could not create a backup."
      );
    }
  };

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
        <div className="sidebar-actions">
          <button
            type="button"
            className="sidebar-action-button"
            onClick={() => void handleBackup()}
            disabled={backupState === "working"}
          >
            <span aria-hidden="true">⤓</span>
            {backupState === "working"
              ? "Encrypting..."
              : "Encrypted backup"}
          </button>

          {backupMessage ? (
            <span
              className={`backup-message ${backupState}`}
              role="status"
            >
              {backupMessage}
            </span>
          ) : null}
        </div>

        <div className="user-card">
          <div className="avatar">U</div>

          <div className="user-info">
            <span className="user-name">Your Workspace</span>
            <span className="user-status">
              {notes.length} {notes.length === 1 ? "note" : "notes"}
            </span>
          </div>

          <button
            type="button"
            className="logout-button"
            onClick={() => void logout()}
            title="Sign out"
          >
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
