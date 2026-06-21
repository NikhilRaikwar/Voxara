import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

vi.mock("../lib/musixmatch", () => ({
  getChartTracks: vi.fn(),
  // Imported elsewhere in the router module graph.
  identifyByLyric: vi.fn(),
  discoverByMood: vi.fn(),
  MOODS: ["heartbreak", "hype", "nostalgic", "romantic", "hopeful", "chill"],
  searchTracks: vi.fn(),
  getTrack: vi.fn(),
  getLyrics: vi.fn(),
  getRichsync: vi.fn(),
  getSubtitles: vi.fn(),
}));
vi.mock("../lib/songstats", () => ({
  getTrackVelocity: vi.fn(),
  getTrackStats: vi.fn(),
}));
vi.mock("../lib/translate", () => ({
  translateLines: vi.fn(),
  translationAvailable: vi.fn(() => true),
  isSupportedLanguage: vi.fn(() => true),
  translateUiStrings: vi.fn(),
}));

import app from "../app";
import { getChartTracks } from "../lib/musixmatch";
import { getTrackVelocity } from "../lib/songstats";

function track(id: number, name: string) {
  return {
    trackId: id,
    commontrackId: id + 100,
    trackName: name,
    artistName: "Artist " + id,
    albumName: null,
    albumCoverUrl: null,
    hasLyrics: true,
    hasRichsync: true,
    hasSubtitles: true,
    hasTranslation: true,
  };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/tracks/breakout", () => {
  beforeEach(() => {
    vi.mocked(getChartTracks).mockResolvedValue([
      track(1, "Low Velocity"),
      track(2, "High Velocity"),
      track(3, "Mid Velocity"),
    ]);
    vi.mocked(getTrackVelocity).mockImplementation(async (name: string) => {
      if (name === "High Velocity") return { found: true, score: 90 };
      if (name === "Mid Velocity") return { found: true, score: 40 };
      return { found: true, score: 5 };
    });
  });

  it("re-ranks chart tracks by velocity score (highest first)", async () => {
    const res = await request(app).get("/api/tracks/breakout");

    expect(res.status).toBe(200);
    expect(res.body.map((t: any) => t.trackName)).toEqual([
      "High Velocity",
      "Mid Velocity",
      "Low Velocity",
    ]);
    expect(res.body[0].velocityScore).toBe(90);
  });

  it("treats a not-found velocity as score 0 (sinks to the bottom)", async () => {
    vi.mocked(getTrackVelocity).mockImplementation(async (name: string) => {
      if (name === "High Velocity") return { found: false, score: 0 };
      if (name === "Mid Velocity") return { found: true, score: 40 };
      return { found: true, score: 5 };
    });

    const res = await request(app).get("/api/tracks/breakout");

    expect(res.status).toBe(200);
    const last = res.body[res.body.length - 1];
    expect(last.trackName).toBe("High Velocity");
    expect(last.velocityScore).toBe(0);
  });
});
