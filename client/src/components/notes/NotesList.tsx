const notes = [
  {
    id: 1,
    title: "RAG Fundamentals",
    category: "AI & RAG",
    preview:
      "Retrieval-Augmented Generation allows an LLM to retrieve external information...",
    updated: "Today",
  },
  {
    id: 2,
    title: "Docker Networking",
    category: "Development",
    preview:
      "Docker networking allows containers to communicate with each other...",
    updated: "Yesterday",
  },
  {
    id: 3,
    title: "React Hooks",
    category: "Development",
    preview:
      "useState and useEffect are fundamental React hooks for managing...",
    updated: "2 days ago",
  },
  {
    id: 4,
    title: "PostgreSQL Notes",
    category: "Development",
    preview:
      "PostgreSQL provides powerful relational database capabilities...",
    updated: "4 days ago",
  },
];

function NotesList() {
  return (
    <div className="notes-list">
      <div className="notes-list-header">
        <span>Notes</span>
        <span>{notes.length}</span>
      </div>

      <div className="notes-list-items">
        {notes.map((note, index) => (
          <button
            key={note.id}
            className={`notes-list-item ${
              index === 0 ? "selected" : ""
            }`}
          >
            <div className="notes-list-item-top">
              <span className="notes-list-category">
                {note.category}
              </span>

              <span className="notes-list-date">
                {note.updated}
              </span>
            </div>

            <h3>{note.title}</h3>

            <p>{note.preview}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

export default NotesList;