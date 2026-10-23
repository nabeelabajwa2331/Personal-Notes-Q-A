import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import AuthGate from "./components/auth/AuthGate";
import AppShell from "./components/layout/AppShell";
import Dashboard from "./components/dashboard/Dashboard";
import NotesPage from "./components/notes/NotesPage";
import QAPage from "./components/qa/QaPage";
import { AuthProvider } from "./context/AuthProvider";
import { NotesProvider } from "./context/NotesProvider";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AuthGate>
          <NotesProvider>
            <AppShell>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/notes" element={<NotesPage />} />
                <Route path="/notes/new" element={<NotesPage />} />
                <Route path="/notes/:id" element={<NotesPage />} />
                <Route path="/qa" element={<QAPage />} />
                <Route
                  path="*"
                  element={<Navigate to="/" replace />}
                />
              </Routes>
            </AppShell>
          </NotesProvider>
        </AuthGate>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
