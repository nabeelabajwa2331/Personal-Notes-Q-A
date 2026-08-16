function NoteEditor() {
  return (
    <div className="note-editor">
      <div className="editor-toolbar">
        <div className="editor-status">
          <span className="save-dot" />
          Saved
        </div>

        <div className="editor-actions">
          <button>•••</button>
        </div>
      </div>

      <div className="editor-content">
        <input
          className="note-title-input"
          value="RAG Fundamentals"
          readOnly
        />

        <div className="note-meta">
          <span>AI & RAG</span>
          <span>Updated today</span>
        </div>

        <textarea
          className="note-content-input"
          value={`# Retrieval-Augmented Generation

RAG stands for Retrieval-Augmented Generation.

It allows an LLM to retrieve relevant external information before generating an answer.

RAG is especially useful when information is private, domain-specific, or frequently changing.

## Core Pipeline

Document → Chunk → Embedding → Vector Database → Retrieval → LLM → Answer

The retrieval stage finds relevant chunks from the knowledge base. Those chunks are then provided to the language model as context.`}
          readOnly
        />
      </div>
    </div>
  );
}

export default NoteEditor;