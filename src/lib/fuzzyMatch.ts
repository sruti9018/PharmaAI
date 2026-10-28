export interface MatchResult {
  medicineId: string;
  name: string;
  similarity: number;
}

export function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().replace(/[^a-z0-9]/g, " ").trim();
  const s2 = str2.toLowerCase().replace(/[^a-z0-9]/g, " ").trim();

  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0;

  // Substring bonus
  if (s1.includes(s2) || s2.includes(s1)) {
    return 0.85;
  }

  // Token overlap (Jaccard on words)
  const words1 = new Set(s1.split(/\s+/).filter(Boolean));
  const words2 = new Set(s2.split(/\s+/).filter(Boolean));

  let common = 0;
  for (const w of words1) {
    if (words2.has(w)) common++;
  }

  const union = new Set([...words1, ...words2]).size;
  const tokenSim = union > 0 ? common / union : 0;

  // Levenshtein distance on words
  const levDist = levenshtein(s1, s2);
  const maxLen = Math.max(s1.length, s2.length);
  const levSim = maxLen > 0 ? (maxLen - levDist) / maxLen : 0;

  return Math.max(tokenSim, levSim);
}

function levenshtein(a: string, b: string): number {
  const an = a ? a.length : 0;
  const bn = b ? b.length : 0;
  if (an === 0) return bn;
  if (bn === 0) return an;

  const matrix = Array.from({ length: bn + 1 }, () => new Array(an + 1).fill(0));
  for (let i = 0; i <= an; ++i) matrix[0][i] = i;
  for (let i = 0; i <= bn; ++i) matrix[i][0] = i;

  for (let i = 1; i <= bn; ++i) {
    for (let j = 1; j <= an; ++j) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }
  return matrix[bn][an];
}

export function findBestMedicineMatch(
  query: string,
  medicines: Array<{ id: string; name: string }>
): { medicineId: string | null; matchedName: string | null; score: number } {
  let bestScore = 0;
  let bestMatch: { medicineId: string | null; matchedName: string | null } = {
    medicineId: null,
    matchedName: null,
  };

  const cleanQuery = query.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
  if (cleanQuery.length < 3) return { medicineId: null, matchedName: null, score: 0 };

  for (const med of medicines) {
    const medMainName = med.name.split(" ")[0].toLowerCase();
    const score = calculateSimilarity(cleanQuery, med.name);

    // If first word matches (e.g. Amoxicillin), give high confidence
    const firstWordQuery = cleanQuery.split(/\s+/)[0];
    const isFirstWordMatch = firstWordQuery === medMainName;
    const finalScore = isFirstWordMatch ? Math.max(score, 0.8) : score;

    if (finalScore > bestScore) {
      bestScore = finalScore;
      bestMatch = { medicineId: med.id, matchedName: med.name };
    }
  }

  // Acceptance threshold
  if (bestScore >= 0.45) {
    return { ...bestMatch, score: bestScore };
  }

  return { medicineId: null, matchedName: null, score: bestScore };
}

