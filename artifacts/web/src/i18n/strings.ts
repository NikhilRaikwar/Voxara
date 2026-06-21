// English UI strings — the single source of truth for the whole interface.
// When a non-English language is selected, these values are translated at
// runtime (one LLM call) and cached client-side. Keys must stay stable.
export const en = {
  // Header / navigation
  "nav.language": "Language",
  "nav.translating": "Translating…",

  // Landing
  "landing.titlePre": "Master any language through the",
  "landing.titleHighlight": "music you love",
  "landing.subtitle":
    "Voxara turns your favorite tracks into interactive pronunciation lessons. Sing along, get graded, and perfect your accent.",
  "landing.searchPlaceholder": "Search for a song or artist...",
  "landing.findTrack": "Find Track",
  "landing.tryDemo": "Try a demo song — no upload needed",
  "landing.featured": "Featured Demo Tracks",
  "landing.noFeatured": "No featured tracks found for this language.",
  "landing.trending": "Trending Now",
  "landing.trendingSub":
    "Today's most popular tracks — with real streaming, Shazam and playlist numbers.",
  "landing.trendingUnavailable": "Trending tracks are unavailable right now.",
  "landing.breakout": "Breakout Tracks",
  "landing.breakoutSub":
    "Chart hits re-ranked by real momentum — live chart presence and fresh playlist reach, not just today's position.",
  "landing.breakoutUnavailable": "Breakout tracks are unavailable right now.",
  "landing.moodTitle": "Discover by Mood",
  "landing.moodSub": "Pick a vibe — we'll find songs whose lyrics match it.",
  "landing.moodUnavailable": "No tracks found for this mood right now.",
  "mood.heartbreak": "Heartbreak",
  "mood.hype": "Hype",
  "mood.nostalgic": "Nostalgic",
  "mood.romantic": "Romantic",
  "mood.hopeful": "Hopeful",
  "mood.chill": "Chill",

  // First-run explainer
  "firstrun.title": "How Voxara works",
  "firstrun.body1":
    "Pick any song to instantly read its lyrics with translations — no upload needed. Then jump into Practice mode to record yourself and get word-by-word pronunciation grading.",
  "firstrun.body2":
    "Want to hear isolated vocals sung back while the words highlight in time? Upload the track's audio in Listen mode — that part's optional, and everything else works without it.",
  "firstrun.gotIt": "Got it",
  "firstrun.dismiss": "Dismiss",

  // Track search
  "search.backHome": "Back to Home",
  "search.placeholder": "Search tracks...",
  "search.modeSong": "Song or artist",
  "search.modeLyric": "A lyric I remember",
  "search.lyricPlaceholder": "Type a line you remember...",
  "search.error": "Something went wrong searching for tracks.",
  "search.results": "Search Results",
  "search.noResults": 'No tracks found for "{query}"',
  "search.tryDifferent": "Try a different song or artist",
  "search.enterTerm": "Enter a search term above to find tracks.",

  // Track card
  "card.wordByWord": "Word-by-word",
  "card.wordByWordTitle": "Word-by-word highlighting and pronunciation grading",
  "card.linePractice": "Line practice",
  "card.linePracticeTitle": "Line-level highlighting and practice",
  "card.readOnly": "Read-only",
  "card.readOnlyTitle": "Read along only — no timing for practice",
  "card.translation": "Translation",
  "stats.streams": "streams",
  "stats.shazams": "Shazams",
  "stats.playlists": "playlists",

  // Listen mode
  "listen.backToSearch": "Back to Search",
  "listen.provideAudio": "Provide Track Audio",
  "listen.uploadPrompt":
    "Upload the audio file for {trackName}. Voxara will isolate the vocals so you can hear the pronunciation clearly.",
  "listen.selectFile": "Select Audio File",
  "listen.fileTypes": "MP3, WAV, or M4A",
  "listen.uploadExplainer":
    "Voxara doesn't stream audio — Musixmatch's plan doesn't include playback rights, and ElevenLabs needs a source file to isolate the vocals from. Upload the track to hear isolated vocals; you can still read the synced lyrics and translations below without it.",
  "listen.uploadOptional": "Optional: hear isolated vocals",
  "listen.dismiss": "Dismiss",
  "listen.isolating": "Isolating Vocals...",
  "listen.isolatingSub":
    "This can take up to a minute for a full song. Hang tight.",
  "listen.viewRecap": "View Session Recap",
  "listen.failedSession": "Failed to load lyrics session.",
  "listen.syncNone":
    "Timing isn't available for this track, so we're showing the plain lyrics. Listening and reading still work, but pronunciation practice needs a synced track.",
  "listen.readyToPractice": "Ready to practice?",
  "listen.readyWord":
    "Record yourself and get word-by-word pronunciation grading.",
  "listen.readyLine":
    "Record yourself line by line and get pronunciation grading.",
  "listen.startPractice": "Start Practice",
  "listen.practice": "Practice",
  "listen.noLyrics": "No lyrics available.",

  // Practice mode
  "practice.backToListen": "Back to Listen",
  "practice.playing": "Playing...",
  "practice.playModel": "Play Model Audio",
  "practice.modelUnavailable":
    "Model pronunciation is temporarily unavailable.",
  "practice.tapStop": "Tap to stop recording",
  "practice.tapRecord": "Tap to record your pronunciation",
  "practice.notStored":
    "Recordings are sent only for transcription and are not stored.",
  "practice.grading": "Grading pronunciation...",
  "practice.results": "Results",
  "practice.hear": "Hear",
  "practice.tryAgain": "Try Again",
  "practice.nextLine": "Next Line",

  // Recap
  "recap.complete": "Session Complete",
  "recap.byArtist": "{trackName} by {artistName}",
  "recap.linesPracticed": "Lines Practiced",
  "recap.avgAccuracy": "Avg Accuracy",
  "recap.practiceMore": "Practice More Lines",
  "recap.findNew": "Find New Track",

  // Not found
  "notfound.title": "404 Page Not Found",
  "notfound.desc": "Did you forget to add the page to the router?",
} as const;

export type StringKey = keyof typeof en;
