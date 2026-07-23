import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams, RowClickedEvent } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Drawer, Modal, Select, Tooltip } from 'antd';
import dayjs from 'dayjs';
import { Pause, Play } from 'lucide-react';
import { toast } from '@/shared-util';
import { recogApi } from '../api/recogApi';
import { modelQueryKeys, useExecuteRecogEvaluate, useGetRecogResultList } from '../hooks/useModelQueries';
import { recogQueryKeys, useGetLatestRecogGroup, useGetRecogGroupList } from '../hooks/useRecogQueries';
import type { RecogResultItem, RecogTargetListItem, SttModelItem } from '../types';
import NoData from '@/components/custom/NoData';
import { Badge } from '@/components/ui/badge';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

export interface SttModelRecogDrawerRef {
  open: (model: SttModelItem, engineCode: string) => void;
  close: () => void;
}

type DiffPart = { value: string; type: 'equal' | 'removed' | 'added' };

function computeCharDiff(oldStr: string, newStr: string): DiffPart[] {
  const m = oldStr.length;
  const n = newStr.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = oldStr[i - 1] === newStr[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  const parts: DiffPart[] = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldStr[i - 1] === newStr[j - 1]) {
      parts.unshift({ value: oldStr[i - 1], type: 'equal' });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      parts.unshift({ value: newStr[j - 1], type: 'added' });
      j--;
    } else {
      parts.unshift({ value: oldStr[i - 1], type: 'removed' });
      i--;
    }
  }
  return parts;
}

const RECOG_STATUS_CONFIG: Record<number, string> = {
  10: 'text-gray-500 bg-gray-100',
  15: 'text-gray-500 bg-gray-100',
  16: 'text-red-500 bg-red-50',
  20: 'text-blue-600 bg-blue-50',
  30: 'text-red-500 bg-red-50',
  50: 'text-emerald-600 bg-emerald-50',
};

function StatusBadge({ value, data }: ICellRendererParams<RecogResultItem>) {
  const cls = RECOG_STATUS_CONFIG[data?.recogStatus ?? -1] ?? 'text-gray-500 bg-gray-100';
  return <Badge className={`text-[13px] leading-[13px] font-medium !h-6 ${cls}`}>{value ?? '-'}</Badge>;
}

function InlineDiff({ oldStr, newStr }: { oldStr: string; newStr: string }) {
  const parts = computeCharDiff(oldStr, newStr);
  return (
    <p className="text-sm leading-relaxed break-all">
      {parts.map((part, idx) => {
        if (part.type === 'removed')
          return (
            <span key={idx} className="bg-red-100 text-red-600 line-through">
              {part.value}
            </span>
          );
        if (part.type === 'added')
          return (
            <span key={idx} className="bg-blue-100 text-blue-600">
              {part.value}
            </span>
          );
        return <span key={idx}>{part.value}</span>;
      })}
    </p>
  );
}

const RXTX_KIND_LABEL: Record<string, string> = { '1': '고객', '2': '상담원', '9': '통합' };

const targetColumnDefs: ColDef<RecogTargetListItem>[] = [
  { headerName: '고유번호(UCID)', field: 'ucidGkey', flex: 3, minWidth: 160, tooltipField: 'ucidGkey' },
  { headerName: '정답지 내용', field: 'orgSentence', flex: 4, minWidth: 160, tooltipField: 'orgSentence' },
  {
    headerName: '화자',
    field: 'rxtxKind',
    flex: 1,
    minWidth: 70,
    valueFormatter: ({ value }) => RXTX_KIND_LABEL[String(value)] ?? String(value),
    filterValueGetter: ({ data }) => RXTX_KIND_LABEL[String(data?.rxtxKind)] ?? String(data?.rxtxKind ?? ''),
  },
  { headerName: '등록시간', field: 'loadTime', flex: 2, minWidth: 120, valueFormatter: ({ value }) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '') },
];

const columnDefs: ColDef<RecogResultItem>[] = [
  { headerName: '고유번호(UCID)', field: 'ucidGkey', flex: 3, minWidth: 160 },
  { headerName: '정답지 내용', field: 'orgResult', flex: 3, minWidth: 160 },
  {
    headerName: '화자',
    field: 'rxtxKind',
    flex: 1,
    minWidth: 70,
    valueFormatter: ({ value }) => RXTX_KIND_LABEL[String(value)] ?? String(value),
    filterValueGetter: ({ data }) => RXTX_KIND_LABEL[String(data?.rxtxKind)] ?? String(data?.rxtxKind ?? ''),
  },
  {
    headerName: '진행상태',
    field: 'recogStatusName',
    flex: 1,
    minWidth: 80,
    cellRenderer: StatusBadge,
    cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
  },
  { headerName: '인식률', field: 'recogRate', flex: 1, minWidth: 80, cellRenderer: 'percentBarRenderer', cellStyle: { display: 'flex', alignItems: 'center', padding: '0 8px' } },
  { headerName: '음절개수', field: 'wordCnt', flex: 1, minWidth: 70 },
  { headerName: 'HIT', field: 'hitCnt', flex: 1, minWidth: 70, headerTooltip: '정답지와 STT 결과가 일치한 음절 수' },
  { headerName: 'Deletion', field: 'deletionCnt', flex: 1, minWidth: 70, headerTooltip: '정답지에 있으나 STT가 인식하지 못한 음절 수' },
  { headerName: 'Substitution', field: 'substitutionCnt', flex: 1, minWidth: 70, headerTooltip: '정답지와 다른 음절로 인식한 음절 수' },
  { headerName: 'Insertion', field: 'insertionCnt', flex: 1, minWidth: 70, headerTooltip: '정답지에 없는데 STT가 추가로 인식한 음절 수' },
];

const SttModelRecogDrawer = forwardRef<SttModelRecogDrawerRef>((_, ref) => {
  const [open, setOpen] = useState(false);
  const [model, setModel] = useState<SttModelItem | null>(null);
  const [engineCode, setEngineCode] = useState('');
  const [groupCode, setGroupCode] = useState('');
  const [selectedRow, setSelectedRow] = useState<RecogResultItem | null>(null);
  const [targetPreview, setTargetPreview] = useState<{ open: boolean; targets: RecogTargetListItem[]; groupName: string }>({ open: false, targets: [], groupName: '' });
  const [isFetchingTargets, setIsFetchingTargets] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshSeconds, setRefreshSeconds] = useState(3);
  const { gridOptions } = useAggridOptions();
  const queryClient = useQueryClient();

  useImperativeHandle(ref, () => ({
    open: (m: SttModelItem, ec: string) => {
      setModel(m);
      setEngineCode(ec);
      setGroupCode('');
      setSelectedRow(null);
      setOpen(true);
    },
    close: () => setOpen(false),
  }));

  const handleClose = () => {
    setOpen(false);
    setAutoRefresh(false);
  };

  const { data: groups = [] } = useGetRecogGroupList({ params: { engineCode } });
  const groupOptions = groups.map((g) => ({ label: g.groupName, value: g.groupCode }));

  const { data: latestGroup, status: latestGroupStatus } = useGetLatestRecogGroup({ params: model ? { modelVerId: model.modelVerId } : null });

  useEffect(() => {
    if (groups.length === 0 || groupCode || latestGroupStatus === 'pending') return;
    const latest = latestGroup?.groupCode;
    const preferred = latest && groups.some((g) => g.groupCode === latest) ? latest : groups[0].groupCode;
    setGroupCode(preferred);
  }, [groups, groupCode, latestGroup, latestGroupStatus]);

  const searchParams = model && groupCode ? { modelVerId: model.modelVerId, groupCode } : null;

  const { data, isFetching } = useGetRecogResultList({
    params: searchParams,
    queryOptions: { refetchInterval: autoRefresh ? refreshSeconds * 1000 : false },
  });

  const { mutate: requestResult, isPending } = useExecuteRecogEvaluate({
    mutationOptions: {
      onSuccess: () => {
        toast.success('인식률 측정이 시작되었습니다.');
        queryClient.invalidateQueries({ queryKey: modelQueryKeys.getRecogResultList._def });
      },
      onError: () => toast.error('인식률 측정 요청에 실패했습니다.'),
    },
  });

  const handleEvaluate = async () => {
    if (!model || !groupCode) {
      toast.warning('정답지 그룹을 선택해주세요.');
      return;
    }
    setIsFetchingTargets(true);
    try {
      const targets = await queryClient.fetchQuery({
        queryKey: recogQueryKeys.getRecogTargetList({ groupCode, engineCode }).queryKey,
        queryFn: () => recogApi.getRecogTargetList({ groupCode, engineCode }),
      });
      if (!targets?.length) {
        toast.warning('해당 그룹에 인식률 측정 데이터가 없습니다. 정답지를 등록해주세요.');
        return;
      }
      const groupName = groupOptions.find((g) => g.value === groupCode)?.label ?? groupCode;
      setTargetPreview({ open: true, targets, groupName });
    } finally {
      setIsFetchingTargets(false);
    }
  };

  const handleConfirmEvaluate = () => {
    if (!model) return;
    requestResult({ modelVerId: model.modelVerId, groupCode, engineCode });
    setTargetPreview((prev) => ({ ...prev, open: false }));
    setAutoRefresh(true);
  };

  const handleGroupChange = (value: string) => {
    setGroupCode(value);
    setSelectedRow(null);
  };

  const handleRowClicked = (e: RowClickedEvent<RecogResultItem>) => {
    setSelectedRow(e.data ?? null);
  };

  return (
    <>
      <Drawer
        open={open}
        onClose={handleClose}
        title="모델 인식률 측정"
        closable={{ placement: 'end' }}
        footer={null}
        destroyOnHidden
        styles={{ body: { display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '0 24px' }, wrapper: { width: '65%' } }}
      >
        {/* 툴바 */}
        <div className="flex items-center gap-4 h-16 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[#495057] shrink-0">정답지 그룹</span>
            <Select value={groupCode || undefined} onChange={handleGroupChange} options={groupOptions} placeholder="그룹을 선택하세요" style={{ width: 180 }} />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[#495057] shrink-0">최종 측정 인식률</span>
            {data?.summary?.recogRate != null ? (
              <>
                <span className="text-xl font-bold text-yellow-500 p-2">{data.summary.recogRate}</span>
                {data.summary.recogDate && (
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{dayjs(data.summary.recogDate).format('YYYY-MM-DD HH:mm:ss')}</span>
                )}
              </>
            ) : (
              <span className="text-sm text-gray-400">—</span>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm font-medium text-[#495057] shrink-0">모니터링</span>
            <Select
              value={refreshSeconds}
              onChange={setRefreshSeconds}
              options={[
                { label: '3초', value: 3 },
                { label: '5초', value: 5 },
                { label: '10초', value: 10 },
                { label: '30초', value: 30 },
              ]}
              style={{ width: 72 }}
            />
            <Tooltip title={autoRefresh ? '측정 결과 모니터링 중지' : '측정 결과 모니터링 시작'}>
              <button
                type="button"
                onClick={() => setAutoRefresh((v) => !v)}
                className={`flex items-center justify-center w-9 h-9 rounded border transition-colors ${
                  autoRefresh
                    ? 'border-[var(--color-bt-primary)] bg-[var(--color-bt-primary)] text-white'
                    : 'border-[var(--color-bt-primary)] text-[var(--color-bt-primary)] hover:bg-[var(--color-bt-primary)]/5'
                }`}
              >
                {autoRefresh ? <Pause className="size-4" /> : <Play className="size-4" />}
              </button>
            </Tooltip>
            <Button color="cyan" variant="solid" onClick={handleEvaluate} loading={isPending || isFetchingTargets}>
              인식률 측정
            </Button>
          </div>
        </div>

        {/* 컨텐츠 영역 */}
        <div className="flex flex-col flex-1 min-h-0">
          {/* 그리드: 로우 미선택 시 전체, 선택 시 55% */}
          <div style={{ height: selectedRow ? '55%' : '100%', flexShrink: 0, overflow: 'hidden' }}>
            {groupCode ? (
              <AgGridReact<RecogResultItem>
                rowData={data?.items ?? []}
                columnDefs={columnDefs}
                gridOptions={gridOptions}
                loading={isFetching}
                sideBar={false}
                onRowClicked={handleRowClicked}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <NoData message="정답지 그룹을 선택해주세요." />
              </div>
            )}
          </div>

          {/* 비교 패널: 로우 선택 시에만 표시 */}
          {selectedRow && (
            <div style={{ height: '45%', flexShrink: 0, overflow: 'hidden' }} className="pt-3 pb-4">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 h-full flex flex-col gap-3">
                {selectedRow.sttResult == null ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2">
                    <p className="text-sm font-semibold text-gray-500">STT 결과가 아직 없습니다.</p>
                    <p className="text-xs text-gray-400">측정이 완료되면 결과를 확인할 수 있습니다.</p>
                  </div>
                ) : (
                  <>
                    {/* 타이틀 + 인라인 diff */}
                    <div className="flex-1 min-h-0 flex flex-col gap-2">
                      <div className="flex items-center justify-between shrink-0">
                        <p className="text-sm font-semibold text-[#212529]">인식률 측정 결과 비교</p>
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1.5 text-xs text-red-500">
                            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                            정답지 내용(삭제)
                          </span>
                          <span className="flex items-center gap-1.5 text-xs text-blue-500">
                            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                            STT 결과(추가)
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-h-0 bg-white border border-gray-200 rounded-xl p-4 overflow-auto">
                        <InlineDiff oldStr={selectedRow.orgResult} newStr={selectedRow.sttResult} />
                      </div>
                    </div>
                    {/* 정답지 내용 / STT 결과 */}
                    <div className="flex-1 min-h-0 grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2 min-h-0">
                        <p className="text-sm font-semibold text-[#212529] shrink-0">정답지 내용</p>
                        <div className="flex-1 min-h-0 bg-white border border-gray-200 rounded-xl p-3 text-sm text-[#495057] break-all overflow-auto">{selectedRow.orgResult}</div>
                      </div>
                      <div className="flex flex-col gap-2 min-h-0">
                        <p className="text-sm font-semibold text-[#212529] shrink-0">STT 결과</p>
                        <div className="flex-1 min-h-0 bg-white border border-gray-200 rounded-xl p-3 text-sm text-[#495057] break-all overflow-auto">{selectedRow.sttResult}</div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </Drawer>

      <Modal
        open={targetPreview.open}
        onCancel={() => setTargetPreview((prev) => ({ ...prev, open: false }))}
        title={`정답지 목록 확인 — ${targetPreview.groupName} (${targetPreview.targets.length}건)`}
        width={800}
        footer={
          <div className="flex justify-end gap-2">
            <Button onClick={() => setTargetPreview((prev) => ({ ...prev, open: false }))}>취소</Button>
            <Button type="primary" onClick={handleConfirmEvaluate} loading={isPending}>
              측정 시작
            </Button>
          </div>
        }
        destroyOnHidden
      >
        <div style={{ height: 400 }}>
          <AgGridReact<RecogTargetListItem> {...gridOptions} rowData={targetPreview.targets} columnDefs={targetColumnDefs} pagination={false} statusBar={undefined} />
        </div>
      </Modal>
    </>
  );
});

SttModelRecogDrawer.displayName = 'SttModelRecogDrawer';
export default SttModelRecogDrawer;
