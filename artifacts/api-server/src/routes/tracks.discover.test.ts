import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

vi.mock("../lib/musixmatch", () => ({
  discoverByMood: vi.fn(),
  MOODS: ["heartbreak", "hype", "nostalgic", "romantic", "hopeful", "chill"],
  // Imported elsewhere in the router module graph.
  identifyByLyric: vi.fn(),
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
import { discoverByMood } from "../lib/musixmatch";

const fakeTrack = {
  trackId: 1,
  commontrackId: 2,
  trackName: "Someone Like You",
  artistName: "Adele",
  albumName: null,
  albumCoverUrl: null,
  hasLyrics: true,
  hasRichsync: true,
  hasSubtitles: true,
  hasTranslation: true,
};

beforeEach(() => {
  vi.mocked(discoverByMood).mockResolvedValue([fakeTrack]);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/tracks/discover", () => {
  it("returns tracks for a known mood", async () => {
    const res = await request(app)
      .get("/api/tracks/discover")
      .query({ mood: "heartbreak" });

    expect(res.status).toBe(200);
    expect(res.body[0].trackName).toBe("Someone Like You");
    expect(discoverByMood).toHaveBeenCalledWith("heartbreak");
  });

  it("rejects an unknown mood without calling the provider", async () => {
    const res = await request(app)
      .get("/api/tracks/discover")
      .query({ mood: "spicy" });

    expect(res.status).toBe(400);
    expect(discoverByMood).not.toHaveBeenCalled();
  });

  it("rejects a missing mood without calling the provider", async () => {
    const res = await request(app).get("/api/tracks/discover");

    expect(res.status).toBe(400);
    expect(discoverByMood).not.toHaveBeenCalled();
  });
});
