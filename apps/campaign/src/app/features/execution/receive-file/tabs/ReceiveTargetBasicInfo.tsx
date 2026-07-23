import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from 'antd';
import dayjs from 'dayjs';
import { createUUID, toast } from '@/shared-util';
import ReceiveTargetInfoGrid from '../components/ReceiveTargetInfoGrid';
import { RECEIVE_TARGET_FIELD_SAVE_MAP, createInitialReceiveTargetFormFields } from '../constants/receiveTargetFieldConstants';
import type { ReceiveFileDetailItem } from '../types/receiveFileList';
import type { ReceiveTargetFormField } from '../types/receiveTargetForm';

function buildReceiveFileDetailItem(receiveFileId: string, fields: ReceiveTargetFormField[]): ReceiveFileDetailItem {
  const getValue = (index: number) => fields[index]?.value.trim() ?? '';

  const item: ReceiveFileDetailItem = {
    detailId: createUUID(),
    receiveFileId,
    customerName: getValue(RECEIVE_TARGET_FIELD_SAVE_MAP.customerName),
    mobilePhone: getValue(RECEIVE_TARGET_FIELD_SAVE_MAP.mobilePhone),
    customerNumber: getValue(RECEIVE_TARGET_FIELD_SAVE_MAP.customerNumber),
    customerKey: getValue(RECEIVE_TARGET_FIELD_SAVE_MAP.customerKey),
    workDateTime: dayjs().format('YYYY-MM-DDTHH:mm:ss'),
  };

  for (let i = RECEIVE_TARGET_FIELD_SAVE_MAP.extraInfoStartIndex; i < fields.length; i += 1) {
    const extraIndex = i - RECEIVE_TARGET_FIELD_SAVE_MAP.extraInfoStartIndex + 1;
    if (extraIndex > 12) break;
    const value = getValue(i);
    if (!value) continue;
    item[`extraInfo${extraIndex}` as keyof ReceiveFileDetailItem] = value as never;
  }

  return item;
}

export default function ReceiveTargetBasicInfo() {
  const navigate = useNavigate();
  const { receiveFileId } = useParams();
  const receiveFile = receiveFileId ? { receiveFileId } : undefined;
  const [formFields, setFormFields] = useState<ReceiveTargetFormField[]>(() => createInitialReceiveTargetFormFields());

  const handleValueChange = (fieldId: string, value: string) => {
    setFormFields((prev) => prev.map((field) => (field.fieldId === fieldId ? { ...field, value } : field)));
  };

  const handleSave = () => {
    if (!receiveFileId) return;

    const customerName = formFields[RECEIVE_TARGET_FIELD_SAVE_MAP.customerName]?.value.trim() ?? '';
    const mobilePhone = formFields[RECEIVE_TARGET_FIELD_SAVE_MAP.mobilePhone]?.value.trim() ?? '';

    if (!customerName || !mobilePhone) {
      toast.warning('CUST_INFO1(고객명), CUST_INFO2(휴대전화) 값을 입력하세요.');
      return;
    }

    const newDetail = buildReceiveFileDetailItem(receiveFileId, formFields);
    navigate('/campaign/execution/receive-file', { state: { addedReceiveTarget: newDetail } });
    toast.success('수신대상이 추가되었습니다. (백엔드 연동 전)');
  };

  const handleClose = () => {
    navigate('/campaign/execution/receive-file');
  };

  if (!receiveFile) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 w-full h-full min-h-[320px]">
        <p className="text-sm text-[#868e96]">수신파일 정보를 찾을 수 없습니다.</p>
        <Button onClick={handleClose}>닫기</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 w-full h-full">
      <h3 className="text-sm font-medium text-[#495057]">수신대상정보</h3>
      <ReceiveTargetInfoGrid rowData={formFields} onValueChange={handleValueChange} />
      <footer className="flex items-center justify-center gap-2 w-full pt-2">
        <Button type="primary" onClick={handleSave}>
          저장
        </Button>
        <Button onClick={handleClose}>닫기</Button>
      </footer>
    </div>
  );
}
