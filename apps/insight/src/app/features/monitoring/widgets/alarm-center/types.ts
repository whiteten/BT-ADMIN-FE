/**
 * 알람센터 위젯 — 정규화 데이터 모델.
 *
 * 헬스보드 알람 카드("알람센터 →" 링크)의 드릴다운 상세 위젯.
 * 데이터 출처: Oracle `TB_CC_ERRHISTORY` (장애 발생 이력).
 *
 * 컬럼(USER_COL_COMMENTS 기준):
 *   ERR_HISOTRY_ID  장애발생이력 ID(PK, 원본 컬럼명 오타 그대로)
 *   ERR_DATE        장애발생일자 (yyyyMMdd)
 *   ERR_TIME        장애발생시간 (HHmmss)
 *   ERR_SYSTEM_ID   장애발생시스템ID
 *   ERR_PROCESS_ID  장애발생프로세스ID / NOTI_PROCESS_ID 장애보고프로세스ID
 *   ERR_CODE        장애오류코드
 *   ERR_KIND        장애종류 / ERR_LEVEL 장애등급(1자리) / ERR_STATUS 장애상태
 *   ERR_ISSUE_KEY   장애발생 KEY
 *   ERR_REPAIR_TIME 장애복구시간(복구 시 set) / ERR_MESSAGE 장애메세지 / ERR_MEMO 장애메모
 *   ERR_GROUP_ID    장애통보그룹ID / ERR_NOTI_TIME 장애통보시간 / DB_INSERT_TIME DB 등록시간
 *
 * ⚠ ERR_LEVEL·ERR_STATUS 의 코드 enum 은 외부부서 확인 전까지 placeholder.
 *   - ERR_LEVEL 은 SYSTEM:STAT STATUS 와 동일 관례(0:Normal/1:Minor/2:Major/3:Critical)로 가정.
 *   - 복구 여부는 ERR_REPAIR_TIME 존재로 1차 판정(가장 의미가 명확한 신호).
 */

export interface AlarmRow {
  /** ERR_HISOTRY_ID */
  id: string;
  /** ERR_DATE (yyyyMMdd) */
  date: string;
  /** ERR_TIME (HHmmss) */
  time: string;
  /** ERR_SYSTEM_ID */
  systemId: string;
  /** 조인으로 채워질 수 있는 시스템 표시명 (없으면 systemId 표시) */
  systemName?: string;
  /** ERR_PROCESS_ID */
  processId?: string;
  /** ERR_CODE */
  code: string;
  /** ERR_KIND (장애종류) */
  kind?: string;
  /** ERR_LEVEL (장애등급) */
  level: number;
  /** ERR_STATUS (장애상태 — raw) */
  status?: string;
  /** ERR_ISSUE_KEY */
  issueKey?: string;
  /** ERR_MESSAGE */
  message: string;
  /** ERR_MEMO */
  memo?: string;
  /** ERR_GROUP_ID */
  groupId?: string;
  /** ERR_REPAIR_TIME (복구시간 — 존재 시 복구 완료로 간주) */
  repairTime?: string;
  /** ERR_NOTI_TIME */
  notiTime?: string;
  /** DB_INSERT_TIME */
  insertTime?: string;
}
