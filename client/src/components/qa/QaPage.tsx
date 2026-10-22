import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { askApi } from "../../api";
import type { AskSource } from "../../api";
import { useNotes } from "../../context/NotesContext";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  sources: AskSource[];
  isError?: boolean;
}

const SUGGESTIONS = [
  "What did I write about Docker networking?",
  "Summarize my notes",
  "What did I learn about RAG?",
];

let messageCounter = 0;

function nextMessageId(): string {
  messageCounter += 1;
  return `message-${Date.now()}-${messageCounter}`;
}

function QAPage() {
  const { notes } = useNotes();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastAutoQuestion = useRef<string | null>(null);

  const askQuestion = useCallback(
    async (rawQuestion: string) => {
      const normalized = rawQuestion.trim();

      if (!normalized || loading) {
        return;
      }

      setMessages((current) => [
        ...current,
        {
          id: nextMessageId(),
          role: "user",
          text: normalized,
          sources: [],
        },
      ]);
      setQuestion("");
      setLoading(true);

      try {
        const result = await askApi.ask(normalized);

        setMessages((current) => [
          ...current,
          {
            id: nextMessageId(),
            role: "assistant",
            text: result.answer,
            sources: result.sources,
          },
        ]);
      } catch (requestError) {
        setMessages((current) => [
          ...current,
          {
            id: nextMessageId(),
            role: "assistant",
            text:
              requestError instanceof Error
                ? requestError.message
                : "Something went wrong while asking your notes.",
            sources: [],
            isError: true,
          },
        ]);
      } finally {
        setLoading(false);
        requestAnimationFrame(() => inputRef.current?.focus());
      }
    },
    [loading]
  );

  const urlQuestion = searchParams.get("q");

  useEffect(() => {
    if (!urlQuestion || urlQuestion === lastAutoQuestion.current) {
      return;
    }

    lastAutoQuestion.current = urlQuestion;
    void askQuestion(urlQuestion);
    setSearchParams({}, { replace: true });
  }, [urlQuestion, askQuestion, setSearchParams]);

  const handleKeyDown = (
    event: KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void askQuestion(question);
    }
  };

  return (
    <div className="qa-page">
      <div className="qa-header">
        <div>
          <span className="section-eyebrow">
            AI KNOWLEDGE ASSISTANT
          </span>

          <h1>Ask your notes.</h1>

          <p>
            Ask questions about your personal knowledge and get
            answers grounded in your notes.
          </p>
        </div>
      </div>

      <div className="qa-content">
        <div className="conversation">
          {messages.length === 0 && !loading && (
            <div className="qa-empty-state">
              <span className="qa-empty-icon">✦</span>
              <h2>Start with a question</h2>
              <p>
                {notes.length === 0
                  ? "Your workspace has no notes yet. Create one first, then come back to ask questions."
                  : `${notes.length} ${
                      notes.length === 1 ? "note is" : "notes are"
                    } ready to search. Answers include links to the notes they came from.`}
              </p>

              {notes.length === 0 ? (
                <Link to="/notes/new" className="primary-button">
                  Create your first note
                </Link>
              ) : (
                <div className="qa-suggestions">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      type="button"
                      key={suggestion}
                      onClick={() => void askQuestion(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {messages.map((message) =>
            message.role === "user" ? (
              <div className="message user-message" key={message.id}>
                <div className="message-label">YOU</div>

                <div className="message-content">{message.text}</div>
              </div>
            ) : (
              <div className="message ai-message" key={message.id}>
                <div className="message-label">
                  <span className="ai-symbol">✦</span>
                  NOTES AI
                </div>

                <div
                  className={`message-content ${
                    message.isError ? "error-text" : ""
                  }`}
                >
                  {message.text
                    .split("\n\n")
                    .filter(Boolean)
                    .map((paragraph, index) => (
                      <p key={`${message.id}-${index}`}>
                        {paragraph}
                      </p>
                    ))}
                </div>

                {message.sources.length > 0 && (
                  <>
                    <div className="answer-divider" />

                    <div className="sources-header">
                      <span>Sources</span>
                      <span>
                        {message.sources.length}{" "}
                        {message.sources.length === 1
                          ? "relevant note"
                          : "relevant notes"}
                      </span>
                    </div>

                    <div className="sources">
                      {message.sources.map((source) => (
                        <button
                          type="button"
                          className="source-card"
                          key={source.noteId}
                          onClick={() =>
                            navigate(`/notes/${source.noteId}`)
                          }
                        >
                          <div className="source-icon">▤</div>

                          <div className="source-info">
                            <span className="source-title">
                              {source.title}
                            </span>

                            <span className="source-description">
                              {source.excerpt}
                            </span>
                          </div>

                          <span className="source-arrow">↗</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )
          )}

          {loading && (
            <div className="qa-loading">
              <span className="save-dot saving" />
              Searching your notes...
            </div>
          )}
        </div>

        <div className="qa-input-container">
          <div className="qa-input-wrapper">
            <textarea
              ref={inputRef}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your notes..."
              rows={1}
              aria-label="Ask a question about your notes"
            />

            <button
              type="button"
              className="qa-send-button"
              onClick={() => void askQuestion(question)}
              disabled={loading || !question.trim()}
              aria-label="Send question"
            >
              →
            </button>
          </div>

          <div className="qa-input-footer">
            <span>Answers are grounded in your notes</span>
            <span>Enter ↵ to send · Shift+Enter for a new line</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default QAPage;
