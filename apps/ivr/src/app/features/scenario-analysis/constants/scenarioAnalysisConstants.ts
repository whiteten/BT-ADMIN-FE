/**
 * 트래킹 아이템 타입 (AS-IS 공통코드 IR_TRACKING_ITEM_TYPE).
 * AS-IS IPR20S6075.jsp의 itemTypeFormatter switch문 기준 — CODE_NAME 대신 화면 라벨로 그대로 사용.
 */
export const TRACKING_ITEM_TYPE = {
  GET_DIGIT: 1,
  MENT_PLAY: 2,
  PACKET: 3,
  CTI: 4,
  QUERY: 5,
  USERDEF: 6,
  COMMON: 99,
} as const;
export type TrackingItemType = (typeof TRACKING_ITEM_TYPE)[keyof typeof TRACKING_ITEM_TYPE];

export const TRACKING_ITEM_TYPE_LABELS: Record<TrackingItemType, string> = {
  [TRACKING_ITEM_TYPE.GET_DIGIT]: 'getDigit',
  [TRACKING_ITEM_TYPE.MENT_PLAY]: 'mentPlay',
  [TRACKING_ITEM_TYPE.PACKET]: 'packet',
  [TRACKING_ITEM_TYPE.CTI]: 'cti',
  [TRACKING_ITEM_TYPE.QUERY]: 'query',
  [TRACKING_ITEM_TYPE.USERDEF]: 'userdef',
  [TRACKING_ITEM_TYPE.COMMON]: '공통',
};
