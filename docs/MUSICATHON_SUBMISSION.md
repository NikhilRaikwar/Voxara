# Voxara — Musicathon 2026 submission kit

Replace the remaining bracketed placeholders and verify every link before
copying this material into the Hub.

## Title

Voxara

## One-liner

Turn any song you love into a synced, multilingual pronunciation lesson.

## Project description

Language learners often understand a textbook sentence but lose the words when
they hear real music. Lyrics pages help them read, yet they do not isolate a
difficult vocal, follow each word in time, or show whether the learner actually
said the line correctly.

Voxara turns one song into a complete practice loop. A learner searches for a
track, uploads audio they are allowed to use, and follows the isolated vocal in
Listen mode. The active word highlights with the music, a target-language
translation explains the current line, and any timed line can open directly in
Practice mode. The learner records an attempt, receives word-by-word recognition
feedback, replays missed words, and ends with a recap of lines practiced and
average accuracy.

Musixmatch Pro is the foundation of this experience. `track.search` and
`chart.tracks.get` power discovery; `track.get` resolves canonical metadata;
`track.richsync.get` supplies the word timestamps that drive karaoke
highlighting, replay, and practice boundaries. When richsync is unavailable,
Voxara progressively falls back to timed subtitles and then plain lyrics from
Musixmatch instead of failing the session. The copyright attribution returned
by Musixmatch remains visible with the lyrics.

ElevenLabs isolates vocals and transcribes the learner's recording. A tolerant
sequence-alignment algorithm compares that transcript with the expected lyric
and explains which words matched, changed, or were missing. Songstats adds
optional cross-platform popularity context without blocking the lesson.

What makes Voxara different is the transition from passive karaoke to deliberate
practice. The same Musixmatch timing data helps a learner hear a phrase, inspect
its meaning, imitate it, and measure improvement in one multilingual interface.
Lyrics are fetched only for real-time display and are not persisted or bulk
cached.

## Required links

- Public demo: `https://voxara.replit.app/`
- Demo video: `[ADD PUBLIC OR UNLISTED VIDEO URL]`
- Source: `https://github.com/NikhilRaikwar/Voxara`
- Cover image: `[ADD CURRENT VOXARA COVER IMAGE]`

## Three-minute demo script

### 0:00–0:20 — Problem

> Songs are full of the pronunciation and rhythm language learners want to
> master, but a static lyrics page cannot slow down a hard line or tell you what
> you actually said. Voxara turns the music you already love into active speaking
> practice.

Show the Voxara landing page and immediately search for a pre-verified demo
track.

### 0:20–0:40 — Solution

> Voxara combines Musixmatch's canonical catalog and word-level richsync with
> vocal isolation and speech transcription. The result is one loop: discover,
> listen, understand, practice, and improve.

Briefly show the use-case diagram from the README, then return to the product.

### 0:40–1:15 — Discovery and preparation

1. Search for the selected track and point out the word-sync capability badge.
2. Mention that search and availability come from `track.search`.
3. Select the track and upload a short, authorized audio file.
4. While isolation runs, explain that provider credentials stay on the server.

### 1:15–1:55 — Listen mode

1. Start playback and show the active word following Musixmatch richsync timing.
2. Switch the target language and show the current-line translation.
3. Replay one difficult phrase or word.
4. Point out the Musixmatch copyright attribution below the lyrics.

### 1:55–2:35 — Practice mode

1. Open Practice directly from the difficult line.
2. Play the model phrase once.
3. Record a prepared attempt with one intentionally changed word.
4. Show the transcript, total score, and matched/substituted/missing states.
5. Replay the missed word, retry, then advance to the recap.

### 2:35–2:50 — Technical proof

> Musixmatch is not an add-on here. Richsync timestamps define the learning
> interaction and the practice boundaries. Voxara also degrades gracefully to
> line subtitles and plain lyrics, while keeping all lyric content ephemeral to
> comply with the contest restrictions.

Show the Musixmatch integration table or the server module for no more than 15
seconds.

### 2:50–3:00 — Close

> Voxara makes authentic music understandable, repeatable, and measurable for
> language learners. Try the live demo and turn your favorite song into your next
> lesson.

## Recording checklist

- [ ] Use a pre-verified track with word-level richsync and translation.
- [ ] Use authorized audio and keep the clip short.
- [ ] Pre-authorize microphone access in the recording browser.
- [ ] Record at 1080p or higher with browser zoom large enough for grading text.
- [ ] Hide provider keys, personal tabs, notifications, and authenticated URLs.
- [ ] Cut upload/loading pauses; do not fake successful output.
- [ ] Keep the final video under three minutes, comfortably below the five-minute
  contest maximum.
- [ ] Test the video and demo URLs in a private browser window.
