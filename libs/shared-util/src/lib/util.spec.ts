import { describe, expect, it } from 'vitest';

import { fuzzyScore } from './search/fuzzy';
import { createUUID } from './util';

/** Vitest 러너 동작 검증 겸 공용 유틸 smoke 테스트. */
describe('createUUID', () => {
  it('UUID v4 형식을 만족한다', () => {
    expect(createUUID()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('호출마다 서로 다른 값을 만든다', () => {
    const ids = new Set(Array.from({ length: 100 }, () => createUUID()));
    expect(ids.size).toBe(100);
  });
});

describe('fuzzyScore', () => {
  it('한글 초성 매칭을 지원한다 (es-hangul 연동)', () => {
    expect(fuzzyScore('ㄱㅅ', '국선관리')).toBeGreaterThanOrEqual(0);
  });

  it('무관한 검색어는 매칭 실패(-1 미만 아님)로 판정한다', () => {
    expect(fuzzyScore('zzz', '국선관리')).toBeLessThan(0);
  });
});
