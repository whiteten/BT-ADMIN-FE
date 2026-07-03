/**
 * 데이터 제공(Data Provider) 도메인 타입 정의.
 * - DB 접속정보(AoeDatabaseDto) / DB 질의도구(AoeDbToolDto) 두 엔티티로 구성.
 * - 코드성 필드(dbmsType/accessType/paramType)는 number 코드값이며,
 *   화면에서는 아래 옵션 맵으로 Select 렌더링한다.
 */

/** DBMS 종류 코드 (100=ORACLE, 200=TIBERO, 300=MYSQL, 400=MARIADB) */
export const DBMS_TYPE_OPTIONS = [
  { label: 'ORACLE', value: 100 },
  { label: 'TIBERO', value: 200 },
  { label: 'MYSQL', value: 300 },
  { label: 'MARIADB', value: 400 },
] as const;

/** 접속 방식 코드 (100=SID, 200=Service Name) */
export const ACCESS_TYPE_OPTIONS = [
  { label: 'SID', value: 100 },
  { label: 'Service Name', value: 200 },
] as const;

/** 파라미터 타입 코드 (100=String, 200=Number) */
export const PARAM_TYPE_OPTIONS = [
  { label: 'String', value: 100 },
  { label: 'Number', value: 200 },
] as const;

/** DB 접속정보 (AoeDatabaseDto) */
export interface DbConnection {
  connId: string;
  connName: string;
  dbmsType: number;
  ipaddr1: string;
  ipaddr2?: string | null;
  port: number;
  accessType: number;
  dataSource: string;
  userId: string;
  /** WRITE-ONLY. 서버는 조회 시 항상 null 로 내려준다. */
  userPasswd?: string | null;
  workTime?: string;
}

/** DB 접속정보 생성/수정 요청 바디 */
export interface DbConnectionCreateDatas {
  connName: string;
  dbmsType: number;
  ipaddr1: string;
  ipaddr2?: string;
  port: number;
  accessType: number;
  dataSource: string;
  userId: string;
  /** 생성 시 필수. 수정 시 비우면 기존 비밀번호 유지. */
  userPasswd?: string;
}

/** DB 질의도구 파라미터 */
export interface DbToolParam {
  paramName: string;
  paramType: number;
  paramDescription?: string | null;
  seq?: number;
}

/** DB 질의도구 (AoeDbToolDto) */
export interface DbTool {
  toolId: string;
  toolName: string;
  toolDescription: string;
  dbConnId: string;
  /** 표시용 (list/detail 응답에 포함) */
  connName?: string | null;
  sqlSentence: string;
  parameters?: DbToolParam[];
  workTime?: string;
}

/** DB 질의도구 생성/수정 요청 바디 */
export interface DbToolCreateDatas {
  toolName: string;
  toolDescription: string;
  dbConnId: string;
  sqlSentence: string;
  parameters?: DbToolParam[];
}
