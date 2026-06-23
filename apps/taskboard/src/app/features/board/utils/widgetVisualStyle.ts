import type { WidgetStyle } from '../types/taskboard.types';

/** 위젯 디자인 기준 캔버스 폭(px) — TaskCreate 편집기에서 위젯 위치/폰트크기를 잡을 때 가정하는 기준폭.
 * 실행 화면(TaskView/RollingDisplay)은 실제 렌더 폭을 이 값과 비교한 비율(fontScale)로 폰트 크기를 보정해
 * 모니터 크기가 달라져도 디자인 시점과 같은 비례로 보이게 한다. */
export const DESIGN_WIDTH = 1024;

export const SHADOW_PRESETS: { label: string; value: NonNullable<WidgetStyle['shadow']>; css: string }[] = [
  { label: '없음', value: 'none', css: 'none' },
  { label: '부드럽게', value: 'soft', css: '0 4px 14px rgba(0,0,0,0.35)' },
  { label: '강하게', value: 'hard', css: '4px 4px 0 rgba(0,0,0,0.55)' },
  { label: '발광', value: 'glow', css: '0 0 16px rgba(255,255,255,0.55)' },
];

// ── 값 변경 시 모션 효과 ──────────────────────────────────────────────────────
export const VALUE_CHANGE_ANIMATIONS: { label: string; value: NonNullable<WidgetStyle['valueChangeAnimation']> }[] = [
  { label: '없음', value: 'none' },
  { label: '펄스', value: 'pulse' },
  { label: '깜빡임', value: 'flash' },
  { label: '흔들림', value: 'shake' },
  { label: '튀어오름', value: 'bounce' },
  { label: '하이라이트', value: 'highlight' },
];

/**
 * 값 변경 모션 keyframes — 이 CSS를 사용하는 화면(TaskCreate/TaskView/RollingDisplay)에서 <style> 태그로 한 번 주입.
 * pulse/shake/bounce는 transform을 직접 덮어쓰면 같이 적용된 위치 세밀조정(valueOffsetX/Y)의 translate가
 * 애니메이션 재생 중에만 사라져 텍스트가 원점으로 순간 이동하는 문제가 있었음 — 매 keyframe에
 * var(--tb-offset-x/y) 기반 translate를 베이스로 깔고 그 뒤에 모션을 합성해 항상 같이 움직이게 함.
 */
export const VALUE_CHANGE_ANIMATION_CSS = `
  @keyframes tbValPulse {
    0% { transform: translate(var(--tb-offset-x, 0px), var(--tb-offset-y, 0px)) scale(1); }
    50% { transform: translate(var(--tb-offset-x, 0px), var(--tb-offset-y, 0px)) scale(1.18); }
    100% { transform: translate(var(--tb-offset-x, 0px), var(--tb-offset-y, 0px)) scale(1); }
  }
  @keyframes tbValFlash { 0%, 100% { opacity: 1; } 50% { opacity: 0.15; } }
  @keyframes tbValShake {
    0%, 100% { transform: translate(var(--tb-offset-x, 0px), var(--tb-offset-y, 0px)) translateX(0); }
    20% { transform: translate(var(--tb-offset-x, 0px), var(--tb-offset-y, 0px)) translateX(-4px); }
    40% { transform: translate(var(--tb-offset-x, 0px), var(--tb-offset-y, 0px)) translateX(4px); }
    60% { transform: translate(var(--tb-offset-x, 0px), var(--tb-offset-y, 0px)) translateX(-3px); }
    80% { transform: translate(var(--tb-offset-x, 0px), var(--tb-offset-y, 0px)) translateX(3px); }
  }
  @keyframes tbValBounce {
    0% { transform: translate(var(--tb-offset-x, 0px), var(--tb-offset-y, 0px)) translateY(0); }
    30% { transform: translate(var(--tb-offset-x, 0px), var(--tb-offset-y, 0px)) translateY(-30%); }
    50% { transform: translate(var(--tb-offset-x, 0px), var(--tb-offset-y, 0px)) translateY(0); }
    70% { transform: translate(var(--tb-offset-x, 0px), var(--tb-offset-y, 0px)) translateY(-10%); }
    100% { transform: translate(var(--tb-offset-x, 0px), var(--tb-offset-y, 0px)) translateY(0); }
  }
  @keyframes tbValHighlight { 0% { background-color: var(--tb-highlight-color, rgba(255,214,51,0.85)); border-radius: 4px; } 100% { background-color: transparent; border-radius: 4px; } }
  .tb-anim-pulse { animation: tbValPulse 0.45s ease; }
  .tb-anim-flash { animation: tbValFlash 0.5s ease; }
  .tb-anim-shake { animation: tbValShake 0.4s ease; }
  .tb-anim-bounce { animation: tbValBounce 0.5s ease; }
  .tb-anim-highlight { animation: tbValHighlight 0.9s ease; }
`;

/** 값 변경 모션의 CSS class — 'none'/미설정이면 빈 문자열 */
export function getValueAnimationClass(animation?: WidgetStyle['valueChangeAnimation']): string {
  return animation && animation !== 'none' ? `tb-anim-${animation}` : '';
}

/** 하이라이트 모션의 사용자 지정 색상을 CSS 변수로 전달 — highlightColor 미지정 시 keyframes의 기본 노란색 유지 */
export function getValueAnimationStyle(style: WidgetStyle): React.CSSProperties {
  if (style.valueChangeAnimation !== 'highlight' || !style.highlightColor) return {};
  return { '--tb-highlight-color': style.highlightColor } as React.CSSProperties;
}

/**
 * 값 텍스트 위치 세밀조정(valueOffsetX/Y) 적용 — 평상시엔 단순 translate, 애니메이션 재생 중에는
 * 위 keyframes가 같은 --tb-offset-x/y 변수를 베이스로 사용해 모션과 오프셋이 항상 함께 움직인다.
 */
export function getValueOffsetStyle(style: WidgetStyle): React.CSSProperties {
  return {
    transform: 'translate(var(--tb-offset-x, 0px), var(--tb-offset-y, 0px))',
    '--tb-offset-x': `${style.valueOffsetX ?? 0}px`,
    '--tb-offset-y': `${style.valueOffsetY ?? 0}px`,
  } as React.CSSProperties;
}

/**
 * 임계치 색상 — value가 숫자로 해석 가능하고 thresholdEnabled가 true일 때,
 * rule.min 이하 중 가장 큰 min을 가진 규칙의 색상을 반환(오름차순 평가 후 마지막 매칭). 매칭 없으면 undefined(기본 색상 유지).
 */
export function getThresholdColor(value: unknown, style: WidgetStyle): string | undefined {
  if (!style.thresholdEnabled || !style.thresholds || style.thresholds.length === 0) return undefined;
  const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/,/g, ''));
  if (Number.isNaN(num)) return undefined;
  let matched: string | undefined;
  [...style.thresholds]
    .sort((a, b) => a.min - b.min)
    .forEach((rule) => {
      if (num >= rule.min) matched = rule.color;
    });
  return matched;
}

/**
 * 1000단위 콤마 — useThousandSep이 켜져 있고 값이 숫자로 해석될 때만 적용.
 * 실행화면(TaskView/RollingDisplay)의 Redis/계산식 값은 문자열로 내려오므로 숫자 문자열도 처리한다.
 */
export function formatWidgetValue(value: string | number, useThousandSep?: boolean): string {
  if (!useThousandSep) return String(value);
  const num = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''));
  if (Number.isNaN(num)) return String(value);
  return num.toLocaleString('ko-KR');
}

/** 위젯 배경이 투명(텍스트만 보이기) 상태인지 여부 */
export const isTransparentBg = (style: WidgetStyle): boolean => style.bgColor === 'rgba(0,0,0,0)' || style.bgColor === 'transparent';

export function getWidgetVisualStyle(style: WidgetStyle, fontScale = 1): React.CSSProperties {
  const shadowCss = SHADOW_PRESETS.find((s) => s.value === (style.shadow ?? 'soft'))?.css ?? SHADOW_PRESETS[1].css;
  const border = (style.borderWidth ?? 0) > 0 ? `${style.borderWidth}px ${style.borderStyle ?? 'solid'} ${style.borderColor ?? '#ffffff'}` : undefined;
  return {
    fontSize: Math.round(style.fontSize * fontScale),
    fontFamily: style.fontFamily,
    fontWeight: style.fontWeight ?? 'normal',
    color: style.color,
    backgroundColor: style.bgColor,
    border,
    borderRadius: `${style.borderRadius ?? 8}px`,
    opacity: (style.opacity ?? 100) / 100,
    boxShadow: shadowCss,
    overflow: 'hidden',
  };
}
