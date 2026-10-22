export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface NoteInput {
  title: string;
  content: string;
}

export interface AskSource {
  noteId: string;
  title: string;
  excerpt: string;
  relevance: number;
}

export interface AskResponse {
  answer: string;
  sources: AskSource[];
}

const configuredApiUrl = (import.meta.env.VITE_API_URL ?? "")
  .trim()
  .replace(/\/+$/, "");

// Accept both a full URL and a bare Render hostname.
const API_BASE_URL =
  configuredApiUrl && !/^https?:\/\//i.test(configuredApiUrl)
    ? `https://${configuredApiUrl}`
    : configuredApiUrl;

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, init);
  } catch {
    throw new ApiError(
      "Could not reach the server. Make sure the backend is running.",
      0
    );
  }

  let payload: unknown = null;

  if (response.status !== 204) {
    const text = await response.text();

    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = null;
      }
    }
  }

  if (!response.ok) {
    const serverMessage =
      typeof payload === "object" &&
      payload !== null &&
      "error" in payload &&
      typeof (payload as { error: unknown }).error === "string"
        ? (payload as { error: string }).error
        : `Request failed with status ${response.status}.`;

    throw new ApiError(serverMessage, response.status);
  }

  return payload as T;
}

const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(body),
});

export const notesApi = {
  list(): Promise<Note[]> {
    return request<Note[]>("/api/notes");
  },

  get(id: string): Promise<Note> {
    return request<Note>(`/api/notes/${encodeURIComponent(id)}`);
  },

  create(input: NoteInput): Promise<Note> {
    return request<Note>("/api/notes", jsonInit("POST", input));
  },

  update(id: string, input: NoteInput): Promise<Note> {
    return request<Note>(
      `/api/notes/${encodeURIComponent(id)}`,
      jsonInit("PUT", input)
    );
  },

  async remove(id: string): Promise<void> {
    await request<void>(`/api/notes/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },

  importFile(file: File): Promise<Note> {
    const formData = new FormData();
    formData.append("file", file);

    return request<Note>("/api/notes/import", {
      method: "POST",
      body: formData,
    });
  },
};

export const askApi = {
  ask(question: string): Promise<AskResponse> {
    return request<AskResponse>(
      "/api/ask",
      jsonInit("POST", { question })
    );
  },
};
