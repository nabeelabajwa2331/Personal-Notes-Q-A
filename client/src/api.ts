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

export interface AuthState {
  authenticated: boolean;
}

export interface BackupDownload {
  blob: Blob;
  filename: string;
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

function serverErrorMessage(
  payload: unknown,
  status: number
): string {
  return typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof (payload as { error: unknown }).error === "string"
    ? (payload as { error: string }).error
    : `Request failed with status ${status}.`;
}

function notifyUnauthorized(path: string): void {
  if (
    path === "/api/auth/login" ||
    typeof window === "undefined"
  ) {
    return;
  }

  window.dispatchEvent(new Event("notes:unauthorized"));
}

async function readPayload(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return null;
  }

  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function request<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      credentials: "include",
    });
  } catch {
    throw new ApiError(
      "Could not reach the server. Make sure the backend is running.",
      0
    );
  }

  const payload = await readPayload(response);

  if (!response.ok) {
    if (response.status === 401) {
      notifyUnauthorized(path);
    }

    throw new ApiError(
      serverErrorMessage(payload, response.status),
      response.status
    );
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

export const authApi = {
  me(): Promise<AuthState> {
    return request<AuthState>("/api/auth/me");
  },

  login(password: string): Promise<AuthState> {
    return request<AuthState>(
      "/api/auth/login",
      jsonInit("POST", { password })
    );
  },

  async logout(): Promise<void> {
    await request<void>("/api/auth/logout", { method: "POST" });
  },
};

export const backupApi = {
  async download(): Promise<BackupDownload> {
    let response: Response;

    try {
      response = await fetch(`${API_BASE_URL}/api/backup/export`, {
        credentials: "include",
      });
    } catch {
      throw new ApiError(
        "Could not reach the server. Make sure the backend is running.",
        0
      );
    }

    if (!response.ok) {
      if (response.status === 401) {
        notifyUnauthorized("/api/backup/export");
      }

      throw new ApiError(
        serverErrorMessage(
          await readPayload(response),
          response.status
        ),
        response.status
      );
    }

    const disposition =
      response.headers.get("content-disposition") ?? "";
    const filenameMatch = /filename="?([^";]+)"?/i.exec(disposition);
    const requestedFilename = filenameMatch?.[1]?.trim();
    const filename =
      requestedFilename &&
      requestedFilename.length <= 120 &&
      !requestedFilename.includes("/") &&
      !requestedFilename.includes("\\")
        ? requestedFilename
        : "personal-notes-backup.json.enc";

    return {
      blob: await response.blob(),
      filename,
    };
  },
};
