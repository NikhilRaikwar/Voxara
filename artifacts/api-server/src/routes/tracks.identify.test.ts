import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

vi.mock("../lib/musixmatch", () => ({
  identifyByLyric: vi.fn(),
  discoverByMood: vi.fn(),
  MOODS: ["heartbreak", "hype", "nostalgic", "romantic", "hopeful", "chill"],
  // Imported elsewhere in the router module graph.
  searchTracks: vi.fn(),
  getChartTracks: vi.fn(),
  getTrack: vi.fn(),
  getLyrics: vi.fn(),
  getRichsync: vi.fn(),
  getSubtitles: vi.fn(),
}));
vi.mock("../lib/translate", () => ({
  translateLines: vi.fn(),
  translationAvailable: vi.fn(() => true),
  isSupportedLanguage: vi.fn(() => true),
  translateUiStrings: vi.fn(),
}));

import app from "../app";
import { identifyByLyric } from "../lib/musixmatch";

const fakeTrack = {
  trackId: 1,
  commontrackId: 2,
  trackName: "Bohemian Rhapsody",
  artistName: "Queen",
  albumName: null,
  albumCoverUrl: null,
  hasLyrics: true,
  hasRichsync: true,
  hasSubtitles: true,
  hasTranslation: true,
};

beforeEach(() => {
  vi.mocked(identifyByLyric).mockResolvedValue([fakeTrack]);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/tracks/identify", () => {
  it("returns matching tracks for a remembered lyric snippet", async () => {
    const res = await request(app)
      .get("/api/tracks/identify")
      .query({ lyric: "is this the real life" });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].trackName).toBe("Bohemian Rhapsody");
    expect(identifyByLyric).toHaveBeenCalledWith("is this the real life");
  });

  it("rejects a too-short snippet without calling the provider", async () => {
    const res = await request(app)
      .get("/api/tracks/identify")
      .query({ lyric: "a" });

    expect(res.status).toBe(400);
    expect(identifyByLyric).not.toHaveBeenCalled();
  });

  it("rejects a missing lyric param without calling the provider", async () => {
    const res = await request(app).get("/api/tracks/identify");

    expect(res.status).toBe(400);
    expect(identifyByLyric).not.toHaveBeenCalled();
  });
});
