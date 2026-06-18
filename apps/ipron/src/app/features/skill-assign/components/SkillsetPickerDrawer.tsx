/**
 * 가용 스킬셋 선택 드로어 — "스킬 추가" 클릭 시 열림.
 *
 * 다중 선택 후 [→ 배정] → bulkAssign mutation.
 */
import { useEffect, useMemo, useState } from 'react';
import { Button, Drawer, Empty, Input, InputNumber, Select, Space, Spin, Tag } from 'antd';
import { Search } from 'lucide-react';
import { toast } from '@/shared-util';
import { useBulkAssignSkillsets, useGetAvailableSkillsets } from '../hooks/useSkillAssignQueries';
import type { AvailableSkillsetResponse } from '../types';

interface Props {
  open: boolean;
  agentId: number | null;
  agentLabel?: string;
  tenantId?: number;
  excludeSkillsetIds: number[]; // 이미 보유한 스킬셋 ID — 비활성화 표시
  onClose: () => void;
}

export default function SkillsetPickerDrawer({ open, agentId, agentLabel, tenantId, excludeSkillsetIds, onClose }: Props) {
  const [keyword, setKeyword] = useState('');
  const [activeYn, setActiveYn] = useState<number | undefined>(1);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [defaultPriority, setDefaultPriority] = useState<number>(0);
  const [defaultSkillLevel, setDefaultSkillLevel] = useState<number>(50);

  const { data: skillsets = [], isLoading } = useGetAvailableSkillsets({
    params: { tenantId, keyword: keyword || undefined, activeYn },
    queryOptions: { enabled: open },
  });

  const { mutate: bulkAssign, isPending } = useBulkAssignSkillsets({
    mutationOptions: {
      onSuccess: (res) => {
        toast.success(`${res.added}건 배정 완료${res.skipped > 0 ? ` (skip ${res.skipped}건)` : ''}`);
        setSelectedIds([]);
        onClose();
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '배정 실패';
        toast.error(msg);
      },
    },
  });

  useEffect(() => {
    if (!open) {
      setSelectedIds([]);
      setKeyword('');
    }
  }, [open]);

  const excludeSet = useMemo(() => new Set(excludeSkillsetIds), [excludeSkillsetIds]);

  const onToggle = (skillsetId: number) => {
    if (excludeSet.has(skillsetId)) return;
    setSelectedIds((prev) => (prev.includes(skillsetId) ? prev.filter((id) => id !== skillsetId) : [...prev, skillsetId]));
  };

  const onSubmit = () => {
    if (!agentId) {
      toast.warning('상담사를 먼저 선택하세요');
      return;
    }
    if (selectedIds.length === 0) {
      toast.warning('배정할 스킬셋을 선택하세요');
      return;
    }
    bulkAssign({
      agentId,
      body: {
        skillsetIds: selectedIds,
        defaultPriority,
        defaultSkillLevel,
      },
    });
  };

  return (
    <Drawer
      title={`스킬셋 추가 — ${agentLabel ?? '-'}`}
      width={640}
      open={open}
      onClose={onClose}
      destroyOnClose
      extra={
        <Space>
          <Button onClick={onClose}>취소</Button>
          <Button type="primary" loading={isPending} disabled={selectedIds.length === 0 || !agentId} onClick={onSubmit}>
            배정 ({selectedIds.length})
          </Button>
        </Space>
      }
    >
      <Space direction="vertical" className="w-full" size="middle">
        <Space wrap>
          <Input
            placeholder="스킬셋명/설명 검색"
            prefix={<Search className="size-3.5 text-gray-400" />}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            style={{ width: 220 }}
          />
          <Select
            value={activeYn}
            onChange={setActiveYn}
            style={{ width: 120 }}
            options={[
              { value: 1, label: '활성만' },
              { value: 0, label: '비활성만' },
              { value: undefined, label: '전체' },
            ]}
          />
          <span className="text-xs text-gray-500">기본 P=</span>
          <InputNumber min={0} max={9} value={defaultPriority} onChange={(v) => setDefaultPriority(v ?? 0)} style={{ width: 70 }} />
          <span className="text-xs text-gray-500">L=</span>
          <InputNumber min={0} max={99} value={defaultSkillLevel} onChange={(v) => setDefaultSkillLevel(v ?? 0)} style={{ width: 80 }} />
        </Space>

        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Spin />
          </div>
        ) : skillsets.length === 0 ? (
          <Empty />
        ) : (
          <div className="flex flex-col gap-1 max-h-[480px] overflow-y-auto border border-gray-200 rounded">
            {skillsets.map((s) => {
              const isExcluded = excludeSet.has(s.skillsetId);
              const isSelected = selectedIds.includes(s.skillsetId);
              return (
                <div
                  key={s.skillsetId}
                  className={`flex items-center gap-2 px-3 py-2 border-b border-gray-100 last:border-b-0 transition ${
                    isExcluded ? 'bg-gray-50 opacity-60 cursor-not-allowed' : isSelected ? 'bg-[#eef0f7] cursor-pointer' : 'hover:bg-gray-50 cursor-pointer'
                  }`}
                  onClick={() => onToggle(s.skillsetId)}
                >
                  <input type="checkbox" checked={isSelected} disabled={isExcluded} onChange={() => onToggle(s.skillsetId)} onClick={(e) => e.stopPropagation()} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">
                      {s.skillsetName}
                      {isExcluded && (
                        <Tag color="default" className="ml-2">
                          이미 보유
                        </Tag>
                      )}
                      {s.activateYn === 0 && (
                        <Tag color="red" className="ml-2">
                          비활성
                        </Tag>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {s.tenantName ?? '-'} · 미디어={s.mediaType ?? '-'} · 보유자 {s.agentCount}명{s.skillsetDesc ? ` · ${s.skillsetDesc}` : ''}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Space>
    </Drawer>
  );
}
