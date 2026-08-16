import { BrowserRouter, Route, Routes } from "react-router-dom";

import AppShell from "./components/layout/AppShell";
import Dashboard from "./components/dashboard/Dashboard";
import NotesPage from "./components/notes/NotesPage";
import QAPage from "./components/qa/QaPage";
<Route path="/notes/new" element={<NotesPage />} />

function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/notes" element={<NotesPage />} />
           <Route path="/notes/new" element={<NotesPage />} />
           <Route path="/notes/:id" element={<NotesPage />} />
          <Route path="/qa" element={<QAPage />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}

export default App;