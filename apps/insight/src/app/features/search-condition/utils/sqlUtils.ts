/**
 * SELECT 절에서 컬럼 alias 목록을 추출한다.
 * WITH...SELECT, AS alias, implicit alias(마지막 식별자) 지원.
 */
export function extractSqlColumnAliases(sql: string): string[] {
  if (!sql?.trim()) return [];

  // 주석 제거
  const cleaned = sql
    .replace(/--[^\n]*/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .trim();

  const upper = cleaned.toUpperCase();

  // depth=0 에서 마지막 SELECT 위치 탐색 (WITH 내 SELECT 제외하기 위해 마지막 것 사용)
  let selectStart = -1;
  let depth = 0;
  for (let i = 0; i < cleaned.length; i++) {
    if (cleaned[i] === '(') {
      depth++;
      continue;
    }
    if (cleaned[i] === ')') {
      depth--;
      continue;
    }
    if (depth === 0 && upper.startsWith('SELECT', i)) {
      const before = i === 0 || /[\s(]/.test(cleaned[i - 1]);
      const after = i + 6 >= cleaned.length || /[\s(]/.test(cleaned[i + 6]);
      if (before && after) selectStart = i;
    }
  }

  if (selectStart === -1) return [];

  const afterSelect = cleaned.slice(selectStart + 6).trimStart();
  const afterUpper = afterSelect.toUpperCase();

  // FROM 위치 탐색 (depth=0)
  let fromIdx = afterSelect.length;
  depth = 0;
  for (let i = 0; i < afterSelect.length - 3; i++) {
    if (afterSelect[i] === '(') {
      depth++;
      continue;
    }
    if (afterSelect[i] === ')') {
      depth--;
      continue;
    }
    if (depth === 0 && afterUpper.startsWith('FROM', i)) {
      const before = i === 0 || /\s/.test(afterSelect[i - 1]);
      const after = i + 4 >= afterSelect.length || /\s/.test(afterSelect[i + 4]);
      if (before && after) {
        fromIdx = i;
        break;
      }
    }
  }

  const colSection = afterSelect.slice(0, fromIdx).trim();

  // 콤마로 분리 (depth=0)
  const colExprs: string[] = [];
  let current = '';
  depth = 0;
  for (const ch of colSection) {
    if (ch === '(') {
      depth++;
      current += ch;
    } else if (ch === ')') {
      depth--;
      current += ch;
    } else if (ch === ',' && depth === 0) {
      colExprs.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) colExprs.push(current.trim());

  return colExprs
    .map((expr) => {
      // AS alias
      const asMatch = expr.match(/\bAS\s+["'`]?(\w+)["'`]?\s*$/i);
      if (asMatch) return asMatch[1].toUpperCase();
      // implicit alias: last identifier
      const words = expr.trim().split(/[\s.]+/);
      const last = words[words.length - 1]?.replace(/["'`]/g, '');
      return last && /^\w+$/.test(last) ? last.toUpperCase() : null;
    })
    .filter((v): v is string => v !== null);
}
