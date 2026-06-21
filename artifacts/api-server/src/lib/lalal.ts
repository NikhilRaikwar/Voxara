import { logger } from "./logger";

const BASE = "https://www.lalal.ai/api";

export class LalalError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = "LalalError";
  }
}

// Account/plan limitations from LALAL are not server faults — surface their
// message to the user (4xx) so it isn't masked by the generic 5xx handler.
function classifyLalalError(message: string): number {
  const m = message.toLowerCase();
  if (
    m.includes("premium") ||
    m.includes("license") ||
    m.includes("limit") ||
    m.includes("subscription") ||
    m.includes("minutes")
  ) {
    return 402;
  }
  return 502;
}

function license(): string {
  const key = process.env.LALAL_API_KEY;
  if (!key) throw new LalalError("LALAL_API_KEY is not configured", 500);
  return key.trim();
}

function authHeader(): Record<string, string> {
  return { Authorization: `license ${license()}` };
}

// Step 1: upload the raw audio bytes, receive an id for the file.
export async function uploadFile(
  buffer: Buffer,
  filename: string,
  contentType: string,
): Promise<string> {
  const res = await fetch(`${BASE}/upload/`, {
    method: "POST",
    headers: {
      ...authHeader(),
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      "Content-Type": contentType || "application/octet-stream",
    },
    body: buffer,
  });
  const body = (await res.json().catch(() => null)) as any;
  if (!res.ok || body?.status !== "success" || !body?.id) {
    logger.warn({ status: res.status, body }, "LALAL upload failed");
    const message = body?.error || "LALAL upload failed";
    throw new LalalError(message, classifyLalalError(message));
  }
  return body.id as string;
}

// Step 2: kick off the split (vocal/instrumental separation).
export async function startSplit(fileId: string): Promise<void> {
  const params = [
    {
      id: fileId,
      stem: "vocals",
      splitter: "phoenix",
      enhanced_processing_enabled: true,
    },
  ];
  const form = new URLSearchParams();
  form.set("params", JSON.stringify(params));

  const res = await fetch(`${BASE}/split/`, {
    method: "POST",
    headers: {
      ...authHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });
  const body = (await res.json().catch(() => null)) as any;
  if (!res.ok || body?.status !== "success") {
    logger.warn({ status: res.status, body }, "LALAL split failed");
    const message = body?.error || "LALAL split failed";
    throw new LalalError(message, classifyLalalError(message));
  }
}

export interface LalalCheck {
  status: "processing" | "success" | "error";
  progress: number | null;
  vocalUrl: string | null;
  error: string | null;
}

// Step 3: poll for progress and the resulting stem URL.
export async function checkStatus(fileId: string): Promise<LalalCheck> {
  const form = new URLSearchParams();
  form.set("id", fileId);

  const res = await fetch(`${BASE}/check/`, {
    method: "POST",
    headers: {
      ...authHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });
  const body = (await res.json().catch(() => null)) as any;
  if (!res.ok || body?.status !== "success") {
    throw new LalalError(body?.error || "LALAL check failed", 502);
  }

  const result = body.result?.[fileId];
  if (!result) {
    return { status: "processing", progress: 0, vocalUrl: null, error: null };
  }

  if (result.status === "error") {
    return {
      status: "error",
      progress: null,
      vocalUrl: null,
      error: result.error || "Isolation failed",
    };
  }

  const task = result.task;
  const split = result.split;

  if (task?.state === "error") {
    return {
      status: "error",
      progress: null,
      vocalUrl: null,
      error: task.error || "Isolation failed",
    };
  }

  if (task?.state === "success" && split?.stem_track) {
    return {
      status: "success",
      progress: 100,
      vocalUrl: split.stem_track as string,
      error: null,
    };
  }

  return {
    status: "processing",
    progress: typeof task?.progress === "number" ? task.progress : 0,
    vocalUrl: null,
    error: null,
  };
}
