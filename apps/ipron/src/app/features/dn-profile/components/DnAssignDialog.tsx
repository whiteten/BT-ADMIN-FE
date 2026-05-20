/**
 * 내선 프로파일 DN 배정 (오른쪽 Drawer, 아래까지 꽉찬 그리드)
 *
 * - 내선 프로파일(type=0) → DN_TYPE IN (11,12) 후보
 * - TRUNK 프로파일(type=1) → DN_TYPE=13 (TDN) 후보
 * - 체크박스 다건 선택 → ipron-dn-profile-assign-dns 호출
 *
 * Backend API: PUT /api/ipron/dn-profiles/{id}/assign-dns
 * body: { dnIds: number[] }
 */
import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Checkbox, Drawer, Empty, Input, Space, Spin } from 'antd';
import { Search } from 'lucide-react';
import { toast } from '@/shared-util';
import { useAssignDnToProfile, useGetDns } from '../../dn/hooks/useDnQueries';
import type { DnResponse } from '../../dn/types';
import { DN_STATUS_LABELS, DN_TYPE_SHORT_LABELS } from '../../dn/utils/dnEnums';
import type { DnProfile } from '../types';

interface DnAssignDialogProps {
  open: boolean;
  profile: DnProfile | null;
  onCancel: () => void;
  onSuccess?: () => void;
}

export default function DnAssignDialog({ open, profile, onCancel, onSuccess }: DnAssignDialogProps) {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // 프로파일 유형별 후보 DN 타입: TRUNK=13, 그 외(내선)=11,12
  const isTrunk = profile?.dnProfileType === '1' || (profile?.dnProfileType as unknown) === 1;

  // 후보 DN 조회 — 같은 노드+테넌트의 유형별 DN
  const params = useMemo(() => {
    if (!profile) return null;
    return {
      nodeId: profile.nodeId,
      tenantId: profile.tenantId,
      dnTypes: isTrunk ? '13' : '11,12',
    };
  }, [profile, isTrunk]);

  const { data: dns = [], isLoading } = useGetDns({
    params: params ?? undefined,
    queryOptions: { enabled: open && !!params },
  });

  const filtered = useMemo(() => {
    const kw = search.trim().toLowerCase();
    if (!kw) return dns;
    return dns.filter((d) => d.dnNo.toLowerCase().includes(kw) || (d.ieUserName ?? '').toLowerCase().includes(kw) || (d.dnProfileName ?? '').toLowerCase().includes(kw));
  }, [dns, search]);

  useEffect(() => {
    if (open) {
      setSearch('');
      setSelectedIds(new Set());
    }
  }, [open]);

  const { mutate: assignDns, isPending } = useAssignDnToProfile({
    mutationOptions: {
      onSuccess: () => {
        toast.success(`${selectedIds.size}개 DN이 프로파일에 배정되었습니다.`);
        onSuccess?.();
        onCancel();
      },
    },
  });

  const toggleOne = (dnId: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(dnId);
      else next.delete(dnId);
      return next;
    });
  };

  const toggleAll = (checked: boolean) => {
    if (checked) setSelectedIds(new Set(filtered.map((d) => d.dnId)));
    else setSelectedIds(new Set());
  };

  const handleAssign = () => {
    if (!profile) return;
    if (selectedIds.size === 0) {
      toast.warning('배정할 DN을 선택하세요.');
      return;
    }
    assignDns({ id: profile.dnProfileId, data: { dnIds: Array.from(selectedIds) } });
  };

  const allChecked = filtered.length > 0 && selectedIds.size === filtered.length;
  const indeterminate = selectedIds.size > 0 && selectedIds.size < filtered.length;

  const titleSuffix = isTrunk ? 'TRUNK DN 배정' : 'DN 배정';

  return (
    <Drawer
      open={open}
      title={profile ? `"${profile.dnProfileName}" — ${titleSuffix}` : titleSuffix}
      onClose={onCancel}
      width={760}
      placement="right"
      destroyOnClose
      styles={{ body: { padding: 16, display: 'flex', flexDirection: 'column', height: '100%' } }}
      extra={
        <Space>
          <Button onClick={onCancel}>취소</Button>
          <Button type="primary" onClick={handleAssign} loading={isPending} disabled={selectedIds.size === 0}>
            배정 ({selectedIds.size})
          </Button>
        </Space>
      }
    >
      <Alert
        type="info"
        showIcon
        className="!mb-3 !flex-shrink-0"
        message={isTrunk ? '선택한 TDN의 TRUNK 프로파일이 현재 프로파일로 변경됩니다' : '선택한 DN의 내선 프로파일이 현재 프로파일로 변경됩니다'}
        description="그룹 DN 소속 DN은 배정 불가 — 백엔드에서 차단. 이미 이 프로파일에 속한 DN도 표시되며 재선택은 무시됩니다."
      />

      <div className="flex items-center gap-2 mb-3 flex-shrink-0">
        <Input
          allowClear
          prefix={<Search className="size-3.5 text-gray-400" />}
          placeholder="DN번호 / 사용자명 / 현재 프로파일명 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 320 }}
        />
        <span className="text-xs text-gray-500 ml-2">{filtered.length.toLocaleString()}건</span>
      </div>

      {/* 테이블 — 남은 높이 전부 사용 */}
      <div className="border border-gray-200 rounded-md overflow-hidden flex flex-col flex-1 min-h-0">
        {/* 헤더 */}
        <div className="flex items-center gap-2 bg-gray-50 border-b border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 flex-shrink-0">
          <Checkbox checked={allChecked} indeterminate={indeterminate} onChange={(e) => toggleAll(e.target.checked)} />
          <div className="w-[100px]">DN번호</div>
          <div className="w-[60px]">유형</div>
          <div className="w-[80px]">상태</div>
          <div className="flex-1">현재 프로파일</div>
          <div className="w-[120px]">사용자명</div>
        </div>
        {/* 바디 — 스크롤 영역 */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Spin />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-8">
              <Empty description="조회된 DN이 없습니다" />
            </div>
          ) : (
            filtered.map((dn: DnResponse) => {
              const isCurrent = profile ? dn.dnProfileId === profile.dnProfileId : false;
              return (
                <div key={dn.dnId} className={`flex items-center gap-2 px-3 py-2 border-b border-gray-100 text-sm hover:bg-blue-50/30 ${isCurrent ? 'bg-gray-50' : ''}`}>
                  <Checkbox checked={selectedIds.has(dn.dnId)} onChange={(e) => toggleOne(dn.dnId, e.target.checked)} disabled={isCurrent} />
                  <div className="w-[100px] font-medium text-gray-800">{dn.dnNo}</div>
                  <div className="w-[60px] text-xs">{DN_TYPE_SHORT_LABELS[dn.dnType] ?? '-'}</div>
                  <div className="w-[80px] text-xs">{DN_STATUS_LABELS[dn.dnStatus] ?? '-'}</div>
                  <div className={`flex-1 text-xs ${isCurrent ? 'text-gray-400' : 'text-gray-700'}`}>
                    {dn.dnProfileName ?? '-'}
                    {isCurrent && <span className="text-blue-600 ml-1">(현재)</span>}
                  </div>
                  <div className="w-[120px] text-xs text-gray-600">{dn.ieUserName ?? '-'}</div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Drawer>
  );
}
