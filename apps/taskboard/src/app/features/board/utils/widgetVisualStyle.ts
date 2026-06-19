import type { WidgetStyle } from '../types/taskboard.types';

export const SHADOW_PRESETS: { label: string; value: NonNullable<WidgetStyle['shadow']>; css: string }[] = [
  { label: '없음', value: 'none', css: 'none' },
  { label: '부드럽게', value: 'soft', css: '0 4px 14px rgba(0,0,0,0.35)' },
  { label: '강하게', value: 'hard', css: '4px 4px 0 rgba(0,0,0,0.55)' },
  { label: '발광', value: 'glow', css: '0 0 16px rgba(255,255,255,0.55)' },
];

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
