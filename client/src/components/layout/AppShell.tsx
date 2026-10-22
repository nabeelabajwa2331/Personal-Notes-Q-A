import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useNotes } from "../../context/NotesContext";
import { snippet } from "../../utils/format";
import Sidebar from "./Sidebar";

interface AppShellProps {
  children: ReactNode;
}

function getPageLabel(pathname: string): string {
  if (pathname === "/") {
    return "Dashboard";
  }

  if (pathname === "/qa") {
    return "Ask AI";
  }

  if (pathname === "/notes") {
    return "All Notes";
  }

  if (pathname === "/notes/new") {
    return "New Note";
  }

  if (pathname.startsWith("/notes/")) {
    return "Note";
  }

  return "Workspace";
}

function AppShell({ children }: AppShellProps) {
  const { notes, loading } = useNotes();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredNotes = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();

    if (!term) {
      return notes.slice(0, 6);
    }

    return notes
      .filter((note) =>
        `${note.title}\n${note.content}`.toLowerCase().includes(term)
      )
      .slice(0, 8);
  }, [notes, searchQuery]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();
        setSearchQuery("");
        setSearchOpen(true);
      }

      if (event.key === "Escape") {
        setSearchOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (searchOpen) {
      searchInputRef.current?.focus();
    }
  }, [searchOpen]);

  const openSearch = () => {
    setSearchQuery("");
    setSearchOpen(true);
  };

  const openNote = (noteId: string) => {
    navigate(`/notes/${noteId}`);
    setSearchOpen(false);
  };

  return (
    <div className="app-shell">
      <Sidebar />

      <main className="main-content">
        <div className="main-content-inner">
          <div className="top-bar">
            <span className="page-indicator">
              Workspace / {getPageLabel(location.pathname)}
            </span>

            <button
              type="button"
              className="search-button"
              onClick={openSearch}
              aria-label="Search notes"
            >
              <span>⌕</span>
              Search notes
              <kbd>⌘ K</kbd>
            </button>
          </div>

          {children}
        </div>
      </main>

      {searchOpen && (
        <div
          className="search-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSearchOpen(false);
            }
          }}
        >
          <div
            className="search-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Search notes"
          >
            <div className="search-input-row">
              <span className="search-input-icon">⌕</span>
              <input
                ref={searchInputRef}
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search titles and note content..."
                aria-label="Search titles and note content"
              />
              <kbd>ESC</kbd>
            </div>

            <div className="search-results">
              {loading ? (
                <p className="search-empty">Loading notes...</p>
              ) : filteredNotes.length === 0 ? (
                <p className="search-empty">
                  No notes match “{searchQuery.trim()}”.
                </p>
              ) : (
                filteredNotes.map((note) => (
                  <button
                    type="button"
                    className="search-result"
                    key={note.id}
                    onClick={() => openNote(note.id)}
                  >
                    <span className="search-result-title">
                      {note.title}
                    </span>
                    <span className="search-result-snippet">
                      {snippet(note.content, 110)}
                    </span>
                  </button>
                ))
              )}
            </div>

            <div className="search-footer">
              <span>{notes.length} notes in workspace</span>
              <span>Open with click</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AppShell;
