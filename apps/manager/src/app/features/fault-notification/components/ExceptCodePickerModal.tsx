import { type ReactNode, forwardRef, useImperativeHandle, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Checkbox, Empty, Input, Modal, Select } from 'antd';
import { Search } from 'lucide-react';
import { fuzzyFilter, toast } from '@/shared-util';
import { BADGE_CLASS, DEFAULT_BADGE_CLASS, ERR_TYPE_BADGE_CLASS } from '../constants/faultNotificationConstants';
import { faultNotificationQueryKeys, useCreateExceptCodes, useGetNoticeCodes } from '../hooks/useFaultNotificationQueries';
import type { NoticeCode } from '../types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface ExceptCodePickerModalRef {
  open: (params: { targetId: string }) => void;
  close: () => void;
}

interface PickerState {
  open: boolean;
  targetId: string;
}

/** 후보 행 고유 키 — (분류, 발신코드) 복합 PK */
const codeKey = (code: Pick<NoticeCode, 'categoryCd' | 'errCode'>) => `${code.categoryCd}:${code.errCode}`;

/**
 * 제외코드 추가 피커 Modal — 코드 사전(ALARM/INFO)에서 다중 선택해 일괄 POST 1회.
 * 이미 제외된 코드는 disabled + 흐림("이미 제외됨"). 코드 사전 편집은 별도 화면 소관.
 */
const ExceptCodePickerModal = forwardRef<ExceptCodePickerModalRef>((_, ref) => {
  const [state, setState] = useState<PickerState>({ open: false, targetId: '' });
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [sysClassFilter, setSysClassFilter] = useState<string>('');
  const [query, setQuery] = useState<string>('');

  const queryClient = useQueryClient();

  const handleClose = () => setState((prev) => ({ ...prev, open: false }));

  useImperativeHandle(ref, () => ({
    open: ({ targetId }) => {
      setSelectedKeys(new Set());
      setSysClassFilter('');
      setQuery('');
      setState({ open: true, targetId });
    },
    close: handleClose,
  }));

  const { data: codes = [], isLoading } = useGetNoticeCodes({
    params: { targetId: state.targetId },
    queryOptions: { enabled: state.open && !!state.targetId },
  });

  const createMutation = useCreateExceptCodes({
    mutationOptions: {
      onSuccess: (_data, variables) => {
        toast.success(`제외코드 ${variables.codes.length}건을 추가했습니다 — 해당 코드 장애는 이 대상에게 발송하지 않습니다.`);
        queryClient.invalidateQueries({ queryKey: faultNotificationQueryKeys.getExceptCodes._def });
        queryClient.invalidateQueries({ queryKey: faultNotificationQueryKeys.getNoticeCodes._def });
        queryClient.invalidateQueries({ queryKey: faultNotificationQueryKeys.getNotiTargets().queryKey });
        handleClose();
      },
      onError: (err) => toast.error(`제외코드 추가 실패: ${(err as Error).message ?? '오류'}`),
    },
  });

  // 전체 후보가 메모리에 있으므로 client-side fuzzy 필터 (add-search 규약)
  const classFiltered = sysClassFilter ? codes.filter((code) => code.sysClassCd === sysClassFilter) : codes;
  const filteredCodes = fuzzyFilter(query, classFiltered, (code) => `${code.errCode} ${code.errName} ${code.categoryName} ${code.categoryCd}`);

  const sysClassOptions = [
    { label: '분류 전체', value: '' },
    ...[...new Map(codes.map((code) => [code.sysClassCd, code.sysClassName])).entries()].map(([value, label]) => ({ label: label || value, value })),
  ];

  const handleToggle = (code: NoticeCode) => {
    if (code.excluded) return;
    const key = codeKey(code);
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSubmit = () => {
    const selected = codes.filter((code) => !code.excluded && selectedKeys.has(codeKey(code)));
    if (selected.length === 0) {
      toast.warning('추가할 제외코드를 선택하세요.');
      return;
    }
    createMutation.mutate({
      targetId: state.targetId,
      codes: selected.map((code) => ({ categoryCd: code.categoryCd, errCode: code.errCode })),
    });
  };

  let listContent: ReactNode;
  if (isLoading) {
    listContent = <FallbackSpinner size={36} tip="코드 사전을 불러오는 중..." />;
  } else if (filteredCodes.length === 0) {
    listContent = (
      <div className="flex items-center justify-center h-full">
        <Empty description="검색된 코드가 없습니다." />
      </div>
    );
  } else {
    listContent = (
      <div className="flex flex-col gap-1">
        {filteredCodes.map((code) => {
          const key = codeKey(code);
          const isSelected = selectedKeys.has(key);
          let rowClass = 'border-transparent hover:bg-gray-50 cursor-pointer';
          if (code.excluded) rowClass = 'border-transparent opacity-40 cursor-not-allowed';
          else if (isSelected) rowClass = 'bg-blue-50 border-blue-200 cursor-pointer';
          return (
            <div key={key} className={cn('flex items-center gap-3 px-3 py-2 rounded-lg border', rowClass)} onClick={() => handleToggle(code)}>
              <Checkbox checked={isSelected} disabled={code.excluded} className="pointer-events-none" />
              <span className="font-mono text-xs text-gray-500 w-16 shrink-0">{code.errCode}</span>
              <div className="flex-1 min-w-0 text-sm">
                <span className="font-medium text-gray-700">{code.errName}</span>
                <span className="text-xs text-gray-400 ml-1.5">
                  {code.categoryName}({code.categoryCd}){code.excluded ? ' · 이미 제외됨' : ''}
                </span>
              </div>
              <Badge className={cn(BADGE_CLASS, ERR_TYPE_BADGE_CLASS[code.errType] ?? DEFAULT_BADGE_CLASS)}>{code.errType}</Badge>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <Modal
      title={`제외코드 추가 — ${state.targetId}`}
      open={state.open}
      onCancel={handleClose}
      width={640}
      footer={
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">
            선택 <b className="text-gray-700">{selectedKeys.size}건</b>
          </span>
          <div className="flex items-center gap-2">
            <Button onClick={handleClose} disabled={createMutation.isPending}>
              취소
            </Button>
            <Button type="primary" onClick={handleSubmit} disabled={selectedKeys.size === 0} loading={createMutation.isPending}>
              제외 추가
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <Select value={sysClassFilter} onChange={setSysClassFilter} options={sysClassOptions} style={{ width: 140 }} />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="발신코드·코드명 검색"
            prefix={<Search className="w-3.5 h-3.5 text-gray-400" />}
            allowClear
            className="flex-1"
          />
        </div>
        <div className="h-90 overflow-y-auto">{listContent}</div>
      </div>
    </Modal>
  );
});
ExceptCodePickerModal.displayName = 'ExceptCodePickerModal';
export default ExceptCodePickerModal;
