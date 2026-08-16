import type { ReactNode } from "react";
import Sidebar from "./Sidebar";

interface AppShellProps {
  children: ReactNode;
}

function AppShell({ children }: AppShellProps) {
  return (
    <div className="app-shell">
      <Sidebar />

      <main className="main-content">
        <div className="main-content-inner">
          <div className="top-bar">
            <span className="page-indicator">Workspace</span>

            <button className="search-button">
              <span>⌕</span>
              Search notes
              <kbd>⌘ K</kbd>
            </button>
          </div>

          {children}
        </div>
      </main>
    </div>
  );
}

export default AppShell;