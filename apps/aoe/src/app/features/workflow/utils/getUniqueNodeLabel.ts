import type { FlowNode } from '../types';

/**
 * 같은 라벨이 이미 존재하면 "라벨 2", "라벨 3" 식으로 다음 번호를 붙여 고유한 라벨을 반환한다.
 * 미사용 번호 중 가장 작은 값을 선택 (예: 1·3 만 있으면 2 를 채움).
 *
 * 사용처: sidebar drag&drop 새 노드 추가, 복사/붙여넣기 노드 복제 등.
 */
export const getUniqueNodeLabel = (baseLabel: string, existingNodes: FlowNode[]): string => {
  const existingLabels = new Set(existingNodes.map((n) => n.nodeLabel).filter((l): l is string => !!l));
  if (!existingLabels.has(baseLabel)) return baseLabel;
  for (let i = 2; i < 10000; i += 1) {
    const candidate = `${baseLabel} ${i}`;
    if (!existingLabels.has(candidate)) return candidate;
  }
  // 거의 도달 불가능 — 비상 fallback
  return `${baseLabel} ${Date.now()}`;
};
