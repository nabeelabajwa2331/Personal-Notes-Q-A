import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useNotes } from "../../context/NotesContext";

const MAX_FILE_SIZE = 15 * 1024 * 1024;

interface ImportNoteButtonProps {
  className?: string;
}

function ImportNoteButton({ className = "" }: ImportNoteButtonProps) {
  const { importNote } = useNotes();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openFilePicker = () => {
    setError(null);
    inputRef.current?.click();
  };

  const handleFileChange = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    const lowerName = file.name.toLowerCase();

    if (!lowerName.endsWith(".pdf") && !lowerName.endsWith(".docx")) {
      setError("Choose a PDF (.pdf) or Word document (.docx).");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("The file is too large. The maximum size is 15 MB.");
      return;
    }

    setImporting(true);
    setError(null);

    try {
      const note = await importNote(file);
      navigate(`/notes/${note.id}`);
    } catch (importError) {
      setError(
        importError instanceof Error
          ? importError.message
          : "Could not import this document."
      );
    } finally {
      setImporting(false);
    }
  };

  return (
    <span className="import-note-control">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="import-note-input"
        onChange={(event) => void handleFileChange(event)}
        tabIndex={-1}
        aria-hidden="true"
      />

      <button
        type="button"
        className={`ghost-button import-note-button ${className}`.trim()}
        onClick={openFilePicker}
        disabled={importing}
        aria-busy={importing}
      >
        <span aria-hidden="true">⇧</span>
        {importing ? "Importing..." : "Import PDF/DOCX"}
      </button>

      {error && (
        <span className="import-note-error" role="alert">
          {error}
        </span>
      )}
    </span>
  );
}

export default ImportNoteButton;
