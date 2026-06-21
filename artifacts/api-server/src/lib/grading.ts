export interface GradedWordResult {
  expected: string;
  status: "match" | "substituted" | "missing";
  actual: string | null;
}

export interface GradingOutcome {
  scorePercent: number;
  words: GradedWordResult[];
  extraWords: string[];
}

// Strip diacritics, punctuation and case so "Está" ~ "esta".
function normalize(word: string): string {
  return word
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

export function tokenize(text: string): string[] {
  return text
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => normalize(w).length > 0);
}

function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }
  return dp[m][n];
}

// Two normalized words count as the same if they're close enough (tolerant matching).
function similar(a: string, b: string): boolean {
  if (a === b) return true;
  const dist = editDistance(a, b);
  const maxLen = Math.max(a.length, b.length);
  if (maxLen <= 3) return dist === 0;
  return dist / maxLen <= 0.34;
}

type Op = "match" | "sub" | "del" | "ins";

// Needleman-Wunsch style alignment between expected and actual token streams.
export function gradeAttempt(
  expectedText: string,
  actualText: string,
): GradingOutcome {
  const expectedRaw = tokenize(expectedText);
  const actualRaw = tokenize(actualText);
  const expected = expectedRaw.map(normalize);
  const actual = actualRaw.map(normalize);

  const m = expected.length;
  const n = actual.length;

  if (m === 0) {
    return { scorePercent: 0, words: [], extraWords: actualRaw };
  }

  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const subCost = similar(expected[i - 1], actual[j - 1]) ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j - 1] + subCost,
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
      );
    }
  }

  // Backtrace to recover the operations.
  const ops: { op: Op; ei?: number; ai?: number }[] = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const subCost = similar(expected[i - 1], actual[j - 1]) ? 0 : 1;
      if (dp[i][j] === dp[i - 1][j - 1] + subCost) {
        ops.push({ op: subCost === 0 ? "match" : "sub", ei: i - 1, ai: j - 1 });
        i--;
        j--;
        continue;
      }
    }
    if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      ops.push({ op: "del", ei: i - 1 });
      i--;
      continue;
    }
    ops.push({ op: "ins", ai: j - 1 });
    j--;
  }
  ops.reverse();

  const words: GradedWordResult[] = [];
  const extraWords: string[] = [];
  let matched = 0;

  for (const o of ops) {
    if (o.op === "match") {
      words.push({
        expected: expectedRaw[o.ei!],
        status: "match",
        actual: actualRaw[o.ai!],
      });
      matched++;
    } else if (o.op === "sub") {
      words.push({
        expected: expectedRaw[o.ei!],
        status: "substituted",
        actual: actualRaw[o.ai!],
      });
    } else if (o.op === "del") {
      words.push({
        expected: expectedRaw[o.ei!],
        status: "missing",
        actual: null,
      });
    } else {
      extraWords.push(actualRaw[o.ai!]);
    }
  }

  const scorePercent = Math.round((matched / m) * 100);
  return { scorePercent, words, extraWords };
}
