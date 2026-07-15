/**
 * ACS 발신 설정 관리 Drawer (AS-IS popupAcsDialConfig).
 *
 * <p>상단: 지역번호 발신 설정(사용유무 + 채번주기/개수 → 적용).
 * 하단: 실패사유코드 재시도 정책 목록 + 추가/수정/삭제 (0~10은 시스템 예약 — 삭제 불가).</p>
 */
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Drawer, InputNumber, Popconfirm, Radio, Select, Table } from 'antd';
import { Check, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from '@/shared-util';
import AcsFailCodeFormModal, { type AcsFailCodeFormModalRef } from './AcsFailCodeFormModal';
import { acsServiceQueryKeys, useDeleteFailCode, useGetDialConfig, useUpdateAreaConfig } from '../hooks/useAcsServiceQueries';
import { AREA_CYCLE_LABELS, type AcsFailCode } from '../types/acsService.types';

export interface AcsDialConfigDrawerRef {
  open: () => void;
}

const AcsDialConfigDrawer = forwardRef<AcsDialConfigDrawerRef>((_props, ref) => {
  const queryClient = useQueryClient();
  const [visible, setVisible] = useState(false);
  const [areaCallUseYn, setAreaCallUseYn] = useState(0);
  const [cycle, setCycle] = useState(0);
  const [count, setCount] = useState(1);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const formModalRef = useRef<AcsFailCodeFormModalRef>(null);

  useImperativeHandle(ref, () => ({
    open: () => {
      setSelectedCodes([]);
      setVisible(true);
    },
  }));

  const { data: dialConfig, isFetching } = useGetDialConfig({
    queryOptions: { enabled: visible },
  });

  // 서버 설정값 → 로컬 편집 상태 동기화
  useEffect(() => {
    if (dialConfig) {
      setAreaCallUseYn(dialConfig.areaCallUseYn ?? 0);
      setCycle(dialConfig.areaCodeNumberingCycle ?? 0);
      setCount(dialConfig.areaCodeNumberingCount ?? 1);
    }
  }, [dialConfig]);

  const { mutate: updateAreaConfigMutate, isPending: isApplying } = useUpdateAreaConfig({
    mutationOptions: {
      onSuccess: () => {
        toast.success('지역 발신 설정이 적용되었습니다.');
        queryClient.invalidateQueries({ queryKey: acsServiceQueryKeys.getDialConfig.queryKey });
      },
      onError: (err) => toast.error(`적용 실패: ${(err as Error).message ?? '오류'}`),
    },
  });

  const { mutate: deleteFailCodeMutate } = useDeleteFailCode({
    mutationOptions: {
      onSuccess: () => {
        toast.success('삭제되었습니다.');
        setSelectedCodes([]);
        queryClient.invalidateQueries({ queryKey: acsServiceQueryKeys.getDialConfig.queryKey });
      },
      onError: (err) => toast.error(`삭제 실패: ${(err as Error).message ?? '오류'}`),
    },
  });

  const failCodes = dialConfig?.failCodes ?? [];
  const selectedRows = failCodes.filter((c) => selectedCodes.includes(c.failCode));

  const handleApplyAreaConfig = () => {
    updateAreaConfigMutate({
      areaCallUseYn,
      areaCodeNumberingCycle: cycle,
      areaCodeNumberingCount: count,
    });
  };

  const handleEdit = () => {
    if (selectedRows.length !== 1) {
      toast.warning('수정할 실패코드를 1건 선택하세요.');
      return;
    }
    formModalRef.current?.openEdit(selectedRows[0]);
  };

  const handleDelete = () => {
    if (selectedRows.length === 0) {
      toast.warning('삭제할 실패코드를 선택하세요.');
      return;
    }
    const reserved = selectedRows.filter((row) => {
      const code = Number(row.failCode);
      return code >= 0 && code <= 10;
    });
    if (reserved.length > 0) {
      toast.error('실패코드 0~10은 시스템 예약 코드로 삭제할 수 없습니다.');
      return;
    }
    selectedRows.forEach((row) => deleteFailCodeMutate(row.failCode));
  };

  return (
    <Drawer
      title="발신 설정 관리"
      placement="right"
      styles={{ wrapper: { width: 760 } }}
      open={visible}
      onClose={() => setVisible(false)}
      destroyOnHidden
      footer={
        <div className="flex justify-between">
          <div className="flex gap-2">
            <Button icon={<Plus className="size-3.5" />} onClick={() => formModalRef.current?.openCreate()}>
              추가
            </Button>
            <Button icon={<Pencil className="size-3.5" />} onClick={handleEdit}>
              수정
            </Button>
            <Popconfirm title="선택한 실패코드를 삭제할까요?" onConfirm={handleDelete} okText="삭제" cancelText="취소">
              <Button danger icon={<Trash2 className="size-3.5" />}>
                삭제
              </Button>
            </Popconfirm>
          </div>
          <Button onClick={() => setVisible(false)}>닫기</Button>
        </div>
      }
    >
      {/* 지역번호 발신 설정 */}
      <div className="border border-gray-200 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-800">지역 발신 사용 유무</span>
            <Radio.Group
              value={areaCallUseYn}
              onChange={(e) => setAreaCallUseYn(e.target.value)}
              options={[
                { value: 1, label: '사용' },
                { value: 0, label: '미사용' },
              ]}
            />
          </div>
          <Button type="primary" icon={<Check className="size-3.5" />} loading={isApplying} onClick={handleApplyAreaConfig}>
            적용
          </Button>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">지역번호 채번 주기</span>
            <Select
              value={cycle}
              onChange={setCycle}
              disabled={areaCallUseYn === 0}
              style={{ width: 120 }}
              options={Object.entries(AREA_CYCLE_LABELS).map(([value, label]) => ({ value: Number(value), label }))}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">지역번호 채번 개수</span>
            <InputNumber min={1} value={count} onChange={(v) => setCount(v ?? 1)} disabled={areaCallUseYn === 0} style={{ width: 120 }} />
          </div>
        </div>
      </div>

      {/* 실패사유코드 재시도 정책 */}
      <Table<AcsFailCode>
        rowKey="failCode"
        size="small"
        loading={isFetching}
        dataSource={failCodes}
        pagination={false}
        rowSelection={{
          selectedRowKeys: selectedCodes,
          onChange: (keys) => setSelectedCodes(keys as string[]),
        }}
        columns={[
          { title: '실패사유코드', dataIndex: 'failCode', width: 110 },
          { title: '실패사유코드명', dataIndex: 'failCodeName' },
          { title: '재시도횟수', dataIndex: 'retryCnt', width: 100 },
          { title: '재시도주기(초)', dataIndex: 'retryPeriod', width: 110 },
          { title: '실패사유내용', dataIndex: 'memo', ellipsis: true },
        ]}
      />
      <AcsFailCodeFormModal ref={formModalRef} />
    </Drawer>
  );
});

AcsDialConfigDrawer.displayName = 'AcsDialConfigDrawer';
export default AcsDialConfigDrawer;
