import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

// Mock the provider clients so the route is exercised without network calls,
// API keys, or ElevenLabs credits.
vi.mock("../lib/musixmatch", () => ({
  getRichsync: vi.fn(),
  getSubtitles: vi.fn(),
  // Imported elsewhere in the router module graph.
  getTrack: vi.fn(),
  getLyrics: vi.fn(),
  searchTracks: vi.fn(),
  identifyByLyric: vi.fn(),
  discoverByMood: vi.fn(),
  MOODS: ["heartbreak", "hype", "nostalgic", "romantic", "hopeful", "chill"],
  getChartTracks: vi.fn(),
}));
vi.mock("../lib/translate", () => ({
  translateLines: vi.fn(),
  translationAvailable: vi.fn(() => true),
  isSupportedLanguage: vi.fn(() => true),
  translateUiStrings: vi.fn(),
}));
vi.mock("../lib/elevenlabs", () => ({
  synthesizeLine: vi.fn(),
  // Imported by other routes in the graph.
  transcribe: vi.fn(),
  isolateVocals: vi.fn(),
  ElevenLabsError: class ElevenLabsError extends Error {
    statusCode: number;
    constructor(message: string, statusCode: number) {
      super(message);
      this.statusCode = statusCode;
    }
  },
}));

import app from "../app";
import { getRichsync, getSubtitles } from "../lib/musixmatch";
import { synthesizeLine } from "../lib/elevenlabs";

function streamOf(bytes: Uint8Array): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}

beforeEach(() => {
  vi.mocked(getRichsync).mockResolvedValue(null);
  vi.mocked(getSubtitles).mockResolvedValue(null);
  vi.mocked(synthesizeLine).mockResolvedValue({
    body: streamOf(new Uint8Array([1, 2, 3])),
    contentType: "audio/mpeg",
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/tracks/:trackId/lines/:index/audio", () => {
  it("synthesizes the richsync line at the given index and streams audio", async () => {
    vi.mocked(getRichsync).mockResolvedValue([
      { ts: 0, te: 2, text: "hola mundo", words: [] },
      { ts: 2, te: 4, text: "segunda linea", words: [] },
    ] as never);

    const res = await request(app)
      .get("/api/tracks/123/lines/1/audio")
      .query({ selected_language: "en" });

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("audio/mpeg");
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(synthesizeLine).toHaveBeenCalledWith("segunda linea");
    // The text must never be a translation or attacker-supplied input.
    expect(getRichsync).toHaveBeenCalledWith(123);
  });

  it("falls back to line-level subtitles when richsync is absent", async () => {
    vi.mocked(getRichsync).mockResolvedValue(null);
    vi.mocked(getSubtitles).mockResolvedValue([
      { text: "line one", time: 0 },
      { text: "line two", time: 5 },
    ] as never);

    const res = await request(app).get("/api/tracks/123/lines/0/audio");

    expect(res.status).toBe(200);
    expect(synthesizeLine).toHaveBeenCalledWith("line one");
  });

  it("returns 404 when the line index is out of range", async () => {
    vi.mocked(getRichsync).mockResolvedValue([
      { ts: 0, te: 2, text: "only line", words: [] },
    ] as never);

    const res = await request(app).get("/api/tracks/123/lines/9/audio");

    expect(res.status).toBe(404);
    expect(synthesizeLine).not.toHaveBeenCalled();
  });

  it("returns 400 for a negative line index", async () => {
    const res = await request(app).get("/api/tracks/123/lines/-1/audio");

    expect(res.status).toBe(400);
    expect(synthesizeLine).not.toHaveBeenCalled();
  });

  it("returns 400 for a non-numeric trackId", async () => {
    const res = await request(app).get("/api/tracks/abc/lines/0/audio");

    expect(res.status).toBe(400);
    expect(synthesizeLine).not.toHaveBeenCalled();
  });
});
