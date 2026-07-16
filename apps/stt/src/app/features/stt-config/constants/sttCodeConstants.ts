import type { CodeItem } from '../types';

/**
 * PA 그룹 (구 공통코드 TB_CC_COMMONCODE CLASS_CD='PA_GROUP').
 * 값이 사실상 고정이라 API 조회 대신 FE 상수로 관리한다.
 */
export const PA_GROUP_OPTIONS: CodeItem[] = [
  { code: '1', value: 'PA 그룹#1' },
  { code: '2', value: 'PA 그룹#2' },
  { code: '3', value: 'PA 그룹#3' },
  { code: '4', value: 'PA 그룹#4' },
  { code: '5', value: 'PA 그룹#5' },
];

/**
 * 엔진(모델) 종류 (구 공통코드 TB_CC_COMMONCODE CLASS_CD='ENGINE_KIND').
 * 값이 사실상 고정이라 API 조회 대신 FE 상수로 관리한다.
 */
export const ENGINE_KIND_OPTIONS: CodeItem[] = [
  { code: 'ENGINE0', value: 'ENGINE#0' },
  { code: 'ENGINE1', value: 'ENGINE#1' },
];
