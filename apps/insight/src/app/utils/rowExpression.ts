/**
 * 계산컬럼 rowExpression 클라이언트 평가기.
 *
 * 그리드 합계(footer) 행에서 계산컬럼을 재계산할 때 사용한다.
 * AS-IS(StatLite)와 동일하게 합계 행은 "베이스 컬럼 집계값에 수식을 다시 적용"한다
 * (율/평균 컬럼을 단순 합산하면 의미가 깨지므로).
 *
 * 지원 문법 — BE CalculatedFieldEngine.evaluateArithmetic 과 동일 범위:
 *   {필드명} 참조, 사칙연산(+ - * /), 괄호, 숫자 리터럴, GREATEST/LEAST(a, b, ...)
 * 0으로 나누면 0 (레거시 동일). 평가 실패 시 null.
 */

/** 수식에서 {필드명} 참조 목록 추출. */
export function extractFieldRefs(expr: string): string[] {
  const refs = new Set<string>();
  for (const m of expr.matchAll(/\{([^}]+)\}/g)) refs.add(m[1]);
  return [...refs];
}

/** {필드명}을 값으로 치환 후 산술 평가. 실패 시 null. */
export function evaluateRowExpression(expr: string, values: Record<string, number>): number | null {
  const substituted = expr.replace(/\{([^}]+)\}/g, (_, name: string) => {
    const v = values[name];
    return Number.isFinite(v) ? String(v) : '0';
  });
  try {
    const p = new Parser(substituted);
    const result = p.parseExpr();
    p.expectEnd();
    return Number.isFinite(result) ? result : null;
  } catch {
    return null;
  }
}

class Parser {
  private pos = 0;
  constructor(private readonly src: string) {}

  parseExpr(): number {
    let v = this.parseTerm();
    for (;;) {
      this.skipWs();
      const c = this.src[this.pos];
      if (c === '+') {
        this.pos++;
        v += this.parseTerm();
      } else if (c === '-') {
        this.pos++;
        v -= this.parseTerm();
      } else {
        return v;
      }
    }
  }

  private parseTerm(): number {
    let v = this.parseFactor();
    for (;;) {
      this.skipWs();
      const c = this.src[this.pos];
      if (c === '*') {
        this.pos++;
        v *= this.parseFactor();
      } else if (c === '/') {
        this.pos++;
        const d = this.parseFactor();
        v = d === 0 ? 0 : v / d; // 분모 0 → 0 (레거시 동일)
      } else {
        return v;
      }
    }
  }

  private parseFactor(): number {
    this.skipWs();
    const c = this.src[this.pos];
    if (c === '-') {
      this.pos++;
      return -this.parseFactor();
    }
    if (c === '(') {
      this.pos++;
      const v = this.parseExpr();
      this.expect(')');
      return v;
    }
    // GREATEST / LEAST
    const func = /^(GREATEST|LEAST)\s*\(/i.exec(this.src.slice(this.pos));
    if (func) {
      const greatest = func[1].toUpperCase() === 'GREATEST';
      this.pos += func[0].length;
      const args: number[] = [this.parseExpr()];
      this.skipWs();
      while (this.src[this.pos] === ',') {
        this.pos++;
        args.push(this.parseExpr());
        this.skipWs();
      }
      this.expect(')');
      return greatest ? Math.max(...args) : Math.min(...args);
    }
    // 숫자 리터럴
    const num = /^\d+(\.\d+)?/.exec(this.src.slice(this.pos));
    if (num) {
      this.pos += num[0].length;
      return parseFloat(num[0]);
    }
    throw new Error(`unexpected token at ${this.pos}: ${this.src.slice(this.pos, this.pos + 10)}`);
  }

  expectEnd(): void {
    this.skipWs();
    if (this.pos < this.src.length) throw new Error(`trailing input: ${this.src.slice(this.pos)}`);
  }

  private expect(ch: string): void {
    this.skipWs();
    if (this.src[this.pos] !== ch) throw new Error(`expected '${ch}' at ${this.pos}`);
    this.pos++;
  }

  private skipWs(): void {
    while (this.pos < this.src.length && /\s/.test(this.src[this.pos])) this.pos++;
  }
}
