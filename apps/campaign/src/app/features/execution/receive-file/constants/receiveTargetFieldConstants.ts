import type { ReceiveTargetFormField } from '../types/receiveTargetForm';

export const RECEIVE_TARGET_FIELD_DATA_TYPE = 'VARCHAR2(256)';

export const RECEIVE_TARGET_FORM_FIELD_COUNT = 13;

export const RECEIVE_TARGET_FORM_FIELD_NAMES = Array.from({ length: RECEIVE_TARGET_FORM_FIELD_COUNT }, (_, index) => `CUST_INFO${index + 1}`);

export function createInitialReceiveTargetFormFields(): ReceiveTargetFormField[] {
  return RECEIVE_TARGET_FORM_FIELD_NAMES.map((fieldName, index) => ({
    fieldId: `field-${index + 1}`,
    fieldName,
    value: '',
    dataType: RECEIVE_TARGET_FIELD_DATA_TYPE,
    description: '',
  }));
}

/** CUST_INFO 인덱스 → ReceiveFileDetailItem 필드 매핑 */
export const RECEIVE_TARGET_FIELD_SAVE_MAP = {
  customerName: 0,
  mobilePhone: 1,
  customerNumber: 2,
  customerKey: 3,
  extraInfoStartIndex: 4,
} as const;
