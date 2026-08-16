function QAPage() {
  return (
    <div className="qa-page">
      <div className="qa-header">
        <div>
          <span className="section-eyebrow">AI KNOWLEDGE ASSISTANT</span>

          <h1>Ask your notes.</h1>

          <p>
            Ask questions about your personal knowledge and get
            answers grounded in your notes.
          </p>
        </div>
      </div>

      <div className="qa-content">
        <div className="conversation">
          <div className="message user-message">
            <div className="message-label">YOU</div>

            <div className="message-content">
              What did I write about Docker networking?
            </div>
          </div>

          <div className="message ai-message">
            <div className="message-label">
              <span className="ai-symbol">✦</span>
              NOTES AI
            </div>

            <div className="message-content">
              <p>
                You wrote that Docker networking allows
                containers to communicate with each other and
                with external networks.
              </p>

              <p>
                You also noted that the bridge network is the
                default network driver and that containers
                connected to the same bridge network can
                communicate with each other.
              </p>
            </div>

            <div className="answer-divider" />

            <div className="sources-header">
              <span>Sources</span>
              <span>2 relevant notes</span>
            </div>

            <div className="sources">
              <button className="source-card">
                <div className="source-icon">▤</div>

                <div className="source-info">
                  <span className="source-title">
                    Docker Networking
                  </span>

                  <span className="source-description">
                    Bridge networks and container communication
                  </span>
                </div>

                <span className="source-arrow">↗</span>
              </button>

              <button className="source-card">
                <div className="source-icon">▤</div>

                <div className="source-info">
                  <span className="source-title">
                    RAG Fundamentals
                  </span>

                  <span className="source-description">
                    Notes about semantic retrieval
                  </span>
                </div>

                <span className="source-arrow">↗</span>
              </button>
            </div>
          </div>
        </div>

        <div className="qa-input-container">
          <div className="qa-input-wrapper">
            <textarea
              placeholder="Ask anything about your notes..."
              rows={1}
            />

            <button className="qa-send-button">
              →
            </button>
          </div>

          <div className="qa-input-footer">
            <span>
              Answers are generated from your notes
            </span>

            <span>Enter ↵</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default QAPage;