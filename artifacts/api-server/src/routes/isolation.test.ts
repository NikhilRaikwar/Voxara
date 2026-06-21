import { afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../app";

// A tiny fake "song" payload. fetch is mocked, so the bytes are never sent to
// ElevenLabs and no credits are consumed — only the route + isolateVocals()
// error-classification + central error handler are exercised.
const fakeAudio = Buffer.from("fake-mp3-bytes");

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/isolation", () => {
  it("returns the isolated audio as binary with Content-Type audio/mpeg", async () => {
    const isolatedBytes = new Uint8Array([1, 2, 3, 4, 5]);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(isolatedBytes, {
        status: 200,
        headers: { "content-type": "audio/mpeg" },
      }),
    );

    const res = await request(app)
      .post("/api/isolation")
      .attach("file", fakeAudio, { filename: "track.mp3", contentType: "audio/mpeg" });

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("audio/mpeg");
    expect(Buffer.isBuffer(res.body)).toBe(true);
    expect(new Uint8Array(res.body)).toEqual(isolatedBytes);
  });

  it("returns 400 with an actionable message when the clip is too short", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ detail: { status: "audio_too_short" } }),
        { status: 400 },
      ),
    );

    const res = await request(app)
      .post("/api/isolation")
      .attach("file", fakeAudio, { filename: "track.mp3", contentType: "audio/mpeg" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/too short/i);
  });

  it("maps ElevenLabs account/quota failures to 402 with the message preserved", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("quota_exceeded", { status: 429 }),
    );

    const res = await request(app)
      .post("/api/isolation")
      .attach("file", fakeAudio, { filename: "track.mp3", contentType: "audio/mpeg" });

    expect(res.status).toBe(402);
    expect(res.body.error).toMatch(/unavailable/i);
    expect(res.body.error).not.toBe("Something went wrong on our end");
  });

  it("returns 400 when no audio file is uploaded", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const res = await request(app).post("/api/isolation");

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/audio file is required/i);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
