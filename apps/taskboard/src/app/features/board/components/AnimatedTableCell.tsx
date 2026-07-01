import { useValueChangeKey } from '../hooks/useValueChangeAnimation';
import type { TableColumn, WidgetStyle } from '../types/taskboard.types';
import { formatWidgetValue, getThresholdColor, getValueAnimationClass, getValueAnimationStyle } from '../utils/widgetVisualStyle';

/**
 * 테이블형 위젯의 셀 1개 — 단일값 위젯의 "값 변경 애니메이션"(widget.style.valueChangeAnimation)을
 * 셀 단위로 재사용한다. 값이 바뀔 때만 이 셀이 깜빡/펄스/흔들림 등으로 반응한다.
 */
export function AnimatedTableCell({
  value,
  col,
  style,
  align,
  borderBottom = '1px solid rgba(255,255,255,0.08)',
  borderRight = 'none',
  rowHeight = 0,
}: {
  value: string | number;
  col: TableColumn;
  style: WidgetStyle;
  align: 'left' | 'center' | 'right';
  /** 행 구분선(테두리) — 'none'이면 표시 안 함. 표 단위 showBorder/borderWidth 설정값으로 계산해 전달 */
  borderBottom?: string;
  /** 열 구분선(세로 테두리) — 마지막 컬럼은 호출부에서 'none'을 넘겨 표 바깥쪽엔 선이 안 남게 함 */
  borderRight?: string;
  /** 표 단위 rowGap 설정값을 그대로 전달 — 셀의 padding이 아니라 `height`(테이블 셀에서는 "최소 높이"로 동작)로
   * 적용해야 한다. padding으로 만든 여백은 항상 아래쪽에 고정돼버려서 verticalAlign(위/중간/아래)이 분배할 수
   * 있는 여유 공간이 없었음(그래서 정렬을 바꿔도 차이가 안 보였음) — height로 셀을 키우면 그 안에서
   * verticalAlign이 실제로 콘텐츠 위치를 옮길 수 있다. */
  rowHeight?: number;
}) {
  const animKey = useValueChangeKey(value);
  const animation = style.valueChangeAnimation;
  const isHighlight = animation === 'highlight';

  return (
    <td
      style={{
        position: 'relative',
        padding: '1px 3px',
        height: rowHeight || undefined,
        textAlign: align,
        verticalAlign: col.verticalAlign ?? 'middle',
        borderBottom,
        borderRight,
        color: getThresholdColor(value, col),
        fontFamily: style.fontFamily,
        fontWeight: style.fontWeight ?? 'normal',
      }}
    >
      {isHighlight && <span key={`hl-${animKey}`} className="absolute inset-0 pointer-events-none tb-anim-highlight" style={getValueAnimationStyle(style)} />}
      {/* display:block + width:100% 필수 — ①CSS 스펙상 non-replaced inline 요소는 transform이 적용되지 않아
          펄스/흔들림/튀어오름(transform 기반)이 무동작이었음(깜빡임/하이라이트만 동작) ②td 폭만큼 채워야
          그 폭을 기준으로 overflow/ellipsis가 동작함(컬럼 간격을 넓게 드래그해 셀이 좁아져도 줄바꿈/깨짐
          대신 "..."으로 잘리게) */}
      <span
        key={animKey}
        className={!isHighlight ? getValueAnimationClass(animation) : ''}
        style={{
          display: 'block',
          width: '100%',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
          textAlign: align,
          ...(!isHighlight ? getValueAnimationStyle(style) : {}),
        }}
      >
        {formatWidgetValue(value, col.useThousandSep)}
      </span>
    </td>
  );
}
