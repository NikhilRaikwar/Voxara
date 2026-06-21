import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

// The session route fans out to Musixmatch (track/lyrics/richsync/subtitles)
// and the LLM translator. We mock those modules so the test exercises only the
// route's syncLevel-tier logic — no network calls, no API keys, no credits.
vi.mock("../lib/musixmatch", () => ({
  getTrack: vi.fn(),
  getLyrics: vi.fn(),
  getRichsync: vi.fn(),
  getSubtitles: vi.fn(),
  // Unused by the session route but imported by the router module.
  searchTracks: vi.fn(),
  getChartTracks: vi.fn(),
}));
vi.mock("../lib/translate", () => ({
  translateLines: vi.fn(),
  translationAvailable: vi.fn(() => true),
}));

import app from "../app";
import {
  getTrack,
  getLyrics,
  getRichsync,
  getSubtitles,
} from "../lib/musixmatch";
import { translateLines, translationAvailable } from "../lib/translate";

const fakeTrack = {
  trackId: 123,
  commontrackId: 456,
  trackName: "Test Song",
  artistName: "Test Artist",
  albumName: "Test Album",
  albumCoverUrl: null,
  hasLyrics: true,
  hasRichsync: false,
  hasSubtitles: true,
  hasTranslation: true,
};

beforeEach(() => {
  vi.mocked(getTrack).mockResolvedValue(fakeTrack);
  vi.mocked(getLyrics).mockResolvedValue({
    body: "line one\nline two\nline three",
    copyright: "© Test",
  });
  vi.mocked(getRichsync).mockResolvedValue(null);
  vi.mocked(getSubtitles).mockResolvedValue(null);
  vi.mocked(translationAvailable).mockReturnValue(true);
  vi.mocked(translateLines).mockImplementation(async (lines: string[]) =>
    lines.map((l) => `translated: ${l}`),
  );
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/tracks/session — line-level fallback", () => {
  it("returns syncLevel 'line' with timed lines, empty words, positive durations, and translations when only subtitles exist", async () => {
    // No word-level richsync, but line-level subtitles are available.
    vi.mocked(getSubtitles).mockResolvedValue([
      { text: "line one", time: 0 },
      { text: "line two", time: 5 },
      { text: "line three", time: 9 },
    ]);

    const res = await request(app)
      .get("/api/tracks/session")
      .query({ trackId: 123, selected_language: "es" });

    expect(res.status).toBe(200);
    expect(res.body.syncLevel).toBe("line");
    expect(res.body.hasRichsync).toBe(false);
    expect(res.body.hasTranslation).toBe(true);
    expect(res.body.plainLyrics).toBeNull();

    expect(Array.isArray(res.body.lines)).toBe(true);
    expect(res.body.lines.length).toBe(3);

    for (const line of res.body.lines) {
      // Line-level fallback carries no word-level timing.
      expect(line.words).toEqual([]);
      // Every line must keep a positive duration or playback/highlighting stalls.
      expect(line.te).toBeGreaterThan(line.ts);
      // Translations flow through into each line.
      expect(line.translation).toBe(`translated: ${line.text}`);
    }

    // Richsync should not have been used to build the lines.
    expect(getRichsync).toHaveBeenCalledWith(123);
    expect(getSubtitles).toHaveBeenCalledWith(123);
  });

  it("keeps a positive duration even when subtitle timestamps are non-increasing", async () => {
    // Pathological LRC where the next line is not strictly after the current.
    vi.mocked(getSubtitles).mockResolvedValue([
      { text: "first", time: 10 },
      { text: "second", time: 10 },
    ]);

    const res = await request(app)
      .get("/api/tracks/session")
      .query({ trackId: 123 });

    expect(res.status).toBe(200);
    expect(res.body.syncLevel).toBe("line");
    for (const line of res.body.lines) {
      expect(line.te).toBeGreaterThan(line.ts);
    }
  });
});

describe("GET /api/tracks/session — no timing fallback", () => {
  it("returns syncLevel 'none' with plain lyrics and empty lines when neither richsync nor subtitles exist", async () => {
    vi.mocked(getRichsync).mockResolvedValue(null);
    vi.mocked(getSubtitles).mockResolvedValue(null);

    const res = await request(app)
      .get("/api/tracks/session")
      .query({ trackId: 123, selected_language: "fr" });

    expect(res.status).toBe(200);
    expect(res.body.syncLevel).toBe("none");
    expect(res.body.hasRichsync).toBe(false);
    expect(res.body.lines).toEqual([]);
    expect(typeof res.body.plainLyrics).toBe("string");
    expect(res.body.plainLyrics).toContain("line one");
  });

  it("treats whitespace-only subtitles as no timing (syncLevel 'none')", async () => {
    vi.mocked(getSubtitles).mockResolvedValue([
      { text: "   ", time: 0 },
      { text: "", time: 4 },
    ]);

    const res = await request(app)
      .get("/api/tracks/session")
      .query({ trackId: 123 });

    expect(res.status).toBe(200);
    expect(res.body.syncLevel).toBe("none");
    expect(res.body.lines).toEqual([]);
  });
});
