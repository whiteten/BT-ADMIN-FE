import { disassemble } from 'es-hangul';

/**
 * 퍼지(fuzzy) 검색 유틸 — VSCode 파일검색식 서브시퀀스 매칭 + 점수 정렬 + 하이라이트 위치 추출.
 *
 * 한글은 두 갈래로 매칭한다:
 *   1. 초성 전용 쿼리 — "ㄷㅅㅂㄷ" → "대시보드"   (자체 1:1 초성 추출)
 *   2. 그 외 — 음절 서브시퀀스(gap 허용). 단 **완성된 글자는 정확히** 비교하고
 *      **마지막 글자만 조합 중(prefix) 허용**한다. 한글 IME 입력 흐름과 일치.
 *        - "대시보" → "대시보드"   (대·시 완성 정확, 보 prefix)
 *        - "서리"   → "서리태" ✅,  "설정 관리" ❌ (서·리 완성 음절 정확 비교)
 *
 * 완성 글자까지 자모로 분해해 흩뿌리면 음절 경계를 넘어 과매칭(서→권의 ㅝ에 박힘)
 * 되므로, 자모 분해는 마지막 글자(타이핑 중)의 prefix 판정에만 쓴다.
 *
 * 영문/숫자는 대소문자 무시 서브시퀀스로 처리한다.
 *
 * 하이라이트 위치(`fuzzyMatchIndices`)는 모두 **원본 문자열 기준 인덱스**로 환산해
 * 반환하므로, 초성·자모로 매치된 경우에도 해당 음절을 그대로 강조할 수 있다.
 */

/** 점수 가중치 — 필요 시 한 곳에서 조정 */
const SCORE = {
  /** 글자 1개 매치 기본 점수 */
  MATCH: 1,
  /** 직전 글자와 연속으로 매치 */
  CONSECUTIVE: 5,
  /** 단어 시작/구분자(`/ _ -` 공백) 직후 매치 */
  BOUNDARY: 10,
  /** camelCase 경계(대문자) 매치 */
  CAMEL: 5,
} as const;

const WORD_BOUNDARY = /[\s/_\-.]/;

/** 한글 초성 19자 — 음절 코드에서 초성 인덱스로 환산해 매핑 */
const CHOSEONG = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const HANGUL_BASE = 0xac00;
const HANGUL_LAST = 0xd7a3;

/**
 * 텍스트를 글자 수가 보존되는(1:1) 초성열로 변환한다.
 * - 완성형 한글 음절 → 초성 1글자
 * - 그 외(라틴·숫자·공백·미완성 자모 등) → 원본 글자 그대로
 *
 * es-hangul의 getChoseong은 비한글을 드롭해 인덱스 정합이 깨지므로 자체 구현한다.
 */
function toChoseongLine(text: string): string {
  let out = '';
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (code >= HANGUL_BASE && code <= HANGUL_LAST) {
      out += CHOSEONG[Math.floor((code - HANGUL_BASE) / 588)];
    } else {
      out += ch;
    }
  }
  return out;
}

/** 입력 문자열이 한글 초성(자음)으로만 구성됐는지 — 초성 검색 모드 판정 */
function isChoseongOnly(query: string): boolean {
  return /^[ㄱ-ㅎ]+$/.test(query);
}

/** query의 각 글자가 haystack에 순서대로 등장하는지(서브시퀀스). 매치 인덱스 배열 또는 null */
function subsequenceIndices(query: string, haystack: string): number[] | null {
  let qi = 0;
  const indices: number[] = [];
  for (let hi = 0; hi < haystack.length && qi < query.length; hi++) {
    if (haystack[hi] === query[qi]) {
      indices.push(hi);
      qi++;
    }
  }
  return qi === query.length ? indices : null;
}

/** 매치 인덱스 배열로부터 점수 계산(경계·연속·camelCase 보너스). original은 보너스 판정용 원본 */
function scoreFromIndices(indices: number[], original: string, useBonus: boolean): number {
  let score = 0;
  let prev = -1;
  for (const hi of indices) {
    score += SCORE.MATCH;
    if (prev === hi - 1) score += SCORE.CONSECUTIVE;
    if (useBonus) {
      const ch = original[hi];
      if (hi === 0 || WORD_BOUNDARY.test(original[hi - 1])) score += SCORE.BOUNDARY;
      if (ch >= 'A' && ch <= 'Z') score += SCORE.CAMEL;
    }
    prev = hi;
  }
  return score;
}

/**
 * 한 글자(queryChar)가 텍스트 한 글자(textChar)의 prefix인지(= 조합 중 매치).
 * - 완전히 같으면 true
 * - 한글이면 자모 분해해 textChar의 자모열이 queryChar 자모열로 시작하는지 비교
 *   (예: "보"→"봇"·"보드", "고"→"곽"(ㄱㅗ→ㄱㅘ 조합), "대"+"ㅅ"→"시")
 * 영문/숫자/공백은 disassemble가 원본을 그대로 반환하므로 == 비교와 동일.
 */
function isSyllablePrefix(queryChar: string, textChar: string): boolean {
  if (queryChar === textChar) return true;
  return disassemble(textChar).startsWith(disassemble(queryChar));
}

/**
 * "완성 글자 정확 + 마지막 글자만 prefix" 규칙의 음절 서브시퀀스 매칭.
 * query의 글자들이 text에 순서대로 등장하면 매치(중간 gap 허용).
 *   - 마지막을 제외한 글자: text 글자와 **정확히 일치**해야 함
 *   - 마지막 글자(타이핑 중): text 글자의 **prefix**면 매치
 * @returns 매치된 text 인덱스 배열(원본 1:1) 또는 null
 */
function syllableSubsequence(query: string, text: string): number[] | null {
  const n = query.length;
  let qi = 0;
  const indices: number[] = [];
  for (let ti = 0; ti < text.length && qi < n; ti++) {
    const isLast = qi === n - 1;
    const matched = isLast ? isSyllablePrefix(query[qi], text[ti]) : query[qi] === text[ti];
    if (matched) {
      indices.push(ti);
      qi++;
    }
  }
  return qi === n ? indices : null;
}

/**
 * 단일 텍스트에 대한 퍼지 매치 점수.
 * @returns 매치 실패 시 -1, 성공 시 0 이상의 점수(클수록 우선)
 */
export function fuzzyScore(query: string, text: string): number {
  const q = query.trim();
  if (!q) return 0; // 빈 쿼리는 전체 통과(점수 0)
  if (!text) return -1;

  // 초성 전용 쿼리 → 텍스트의 초성열에 대해 서브시퀀스 매칭
  if (isChoseongOnly(q)) {
    const hit = subsequenceIndices(q, toChoseongLine(text));
    return hit ? scoreFromIndices(hit, text, false) : -1;
  }

  // 음절 서브시퀀스(완성 정확 + 마지막 prefix)
  const hit = syllableSubsequence(q.toLowerCase(), text.toLowerCase());
  return hit ? scoreFromIndices(hit, text, true) : -1;
}

/**
 * 퍼지 매치된 글자들의 **원본 문자열 기준 인덱스** 배열. 하이라이트(`<mark>`)용.
 * 매치 우선순위는 fuzzyScore와 동일(음절/영문 → 자모, 초성 전용은 초성열).
 * @returns 매치 실패 시 null, 빈 쿼리는 빈 배열([])
 */
export function fuzzyMatchIndices(query: string, text: string): number[] | null {
  const q = query.trim();
  if (!q) return [];
  if (!text) return null;

  if (isChoseongOnly(q)) {
    return subsequenceIndices(q, toChoseongLine(text));
  }

  return syllableSubsequence(q.toLowerCase(), text.toLowerCase());
}

/**
 * 배열을 퍼지 검색으로 필터 + 점수 내림차순 정렬.
 * 대부분의 화면 검색은 이 함수만 쓰면 된다.
 *
 * @param query    검색어
 * @param items    원본 목록
 * @param selector 항목에서 검색 대상 문자열을 뽑는 함수
 * @returns 매치된 항목만, 점수 높은 순
 *
 * @example
 * const filtered = fuzzyFilter(keyword, bots, (b) => b.serviceName);
 */
export function fuzzyFilter<T>(query: string, items: T[], selector: (item: T) => string): T[] {
  const q = query.trim();
  if (!q) return items;

  return items
    .map((item) => ({ item, score: fuzzyScore(q, selector(item)) }))
    .filter(({ score }) => score >= 0)
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);
}
