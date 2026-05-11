import type { Node, NodePositionChange, XYPosition } from '@xyflow/react';

export interface HelperLinesResult {
  horizontal?: number;
  vertical?: number;
  snapPosition: Partial<XYPosition>;
}

/**
 * 드래그 중인 노드의 위치를 다른 노드들과 비교해서 정렬 가이드 라인 좌표 + snap 보정 좌표를 계산한다.
 * ReactFlow 공식 예제 (helper-lines) 패턴.
 *
 * - distance: snap 임계값 (px). 화면 픽셀이 아니라 ReactFlow flow 좌표 기준.
 * - 노드의 측면(left/right/top/bottom) 4 변 일치를 모두 검사.
 */
export const getHelperLines = (change: NodePositionChange, nodes: Node[], distance = 5): HelperLinesResult => {
  const result: HelperLinesResult = { horizontal: undefined, vertical: undefined, snapPosition: { x: undefined, y: undefined } };

  const nodeA = nodes.find((n) => n.id === change.id);
  if (!nodeA || !change.position) return result;

  const aWidth = nodeA.measured?.width ?? 0;
  const aHeight = nodeA.measured?.height ?? 0;
  const aBounds = {
    left: change.position.x,
    right: change.position.x + aWidth,
    top: change.position.y,
    bottom: change.position.y + aHeight,
  };

  let vDist = distance;
  let hDist = distance;

  for (const nodeB of nodes) {
    if (nodeB.id === nodeA.id) continue;
    const bWidth = nodeB.measured?.width ?? 0;
    const bHeight = nodeB.measured?.height ?? 0;
    const bBounds = {
      left: nodeB.position.x,
      right: nodeB.position.x + bWidth,
      top: nodeB.position.y,
      bottom: nodeB.position.y + bHeight,
    };

    // 수직 가이드 (vertical line) — x 좌표 일치 검사
    const dLeftLeft = Math.abs(aBounds.left - bBounds.left);
    if (dLeftLeft < vDist) {
      result.snapPosition.x = bBounds.left;
      result.vertical = bBounds.left;
      vDist = dLeftLeft;
    }
    const dRightRight = Math.abs(aBounds.right - bBounds.right);
    if (dRightRight < vDist) {
      result.snapPosition.x = bBounds.right - aWidth;
      result.vertical = bBounds.right;
      vDist = dRightRight;
    }
    const dLeftRight = Math.abs(aBounds.left - bBounds.right);
    if (dLeftRight < vDist) {
      result.snapPosition.x = bBounds.right;
      result.vertical = bBounds.right;
      vDist = dLeftRight;
    }
    const dRightLeft = Math.abs(aBounds.right - bBounds.left);
    if (dRightLeft < vDist) {
      result.snapPosition.x = bBounds.left - aWidth;
      result.vertical = bBounds.left;
      vDist = dRightLeft;
    }

    // 수평 가이드 (horizontal line) — y 좌표 일치 검사
    const dTopTop = Math.abs(aBounds.top - bBounds.top);
    if (dTopTop < hDist) {
      result.snapPosition.y = bBounds.top;
      result.horizontal = bBounds.top;
      hDist = dTopTop;
    }
    const dBottomBottom = Math.abs(aBounds.bottom - bBounds.bottom);
    if (dBottomBottom < hDist) {
      result.snapPosition.y = bBounds.bottom - aHeight;
      result.horizontal = bBounds.bottom;
      hDist = dBottomBottom;
    }
    const dBottomTop = Math.abs(aBounds.bottom - bBounds.top);
    if (dBottomTop < hDist) {
      result.snapPosition.y = bBounds.top - aHeight;
      result.horizontal = bBounds.top;
      hDist = dBottomTop;
    }
    const dTopBottom = Math.abs(aBounds.top - bBounds.bottom);
    if (dTopBottom < hDist) {
      result.snapPosition.y = bBounds.bottom;
      result.horizontal = bBounds.bottom;
      hDist = dTopBottom;
    }
  }

  return result;
};
