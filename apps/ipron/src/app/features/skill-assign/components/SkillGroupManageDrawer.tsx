/**
 * 스킬모음 관리 드로어 — 스킬셋 관리 화면에서 진입.
 *
 * 모음 목록 + [등록] + 행별 수정/삭제.
 * 등록/수정은 SkillGroupFormDrawer 재사용.
 */
import { useState } from 'react';
import { Button, Drawer, Input, Modal, Spin } from 'antd';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from '@/shared-util';
import { useDeleteSkillGroup, useGetSkillGroups } from '../hooks/useSkillAssignQueries';
import type { SkillGroupResponse } from '../types';
import SkillGroupFormDrawer, { type SkillGroupDrawerState } from './SkillGroupFormDrawer';

interface Props {
  open: boolean;
  tenantId?: number | null;
  onClose: () => void;
}

export default function SkillGroupManageDrawer({ open, tenantId, onClose }: Props) {
  const [groupSearch, setGroupSearch] = useState('');
  const [formState, setFormState] = useState<SkillGroupDrawerState>({ open: false });

  const tenantIdParam = tenantId != null ? tenantId : undefined;

  const { data: groups = [], isLoading: groupsLoading } = useGetSkillGroups({
    params: tenantIdParam != null ? { tenantId: tenantIdParam } : undefined,
    queryOptions: { enabled: open },
  });

  const { mutate: deleteGroup } = useDeleteSkillGroup({
    mutationOptions: {
      onSuccess: () => toast.success('스킬모음이 삭제되었습니다'),
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '삭제 실패';
        toast.error(msg);
      },
    },
  });

  const filteredGroups = groups.filter((g) => {
    const kw = groupSearch.trim().toLowerCase();
    if (!kw) return true;
    return g.skillGroupName.toLowerCase().includes(kw) || (g.skillGroupDesc ?? '').toLowerCase().includes(kw);
  });

  const handleDelete = (group: SkillGroupResponse) => {
    Modal.confirm({
      title: '스킬모음 삭제',
      content: `'${group.skillGroupName}' 스킬모음을 삭제하시겠습니까?`,
      okType: 'danger',
      okText: '삭제',
      cancelText: '취소',
      onOk: () => deleteGroup(group.skillGroupId),
    });
  };

  return (
    <>
      <Drawer
        title="스킬모음 관리"
        closable={{ placement: 'end' }}
        width={560}
        open={open}
        onClose={onClose}
        footer={
          <div className="flex justify-end">
            <Button onClick={onClose}>닫기</Button>
          </div>
        }
      >
        {/* 검색 + 등록 */}
        <div className="flex items-center gap-2 mb-3">
          <Input
            allowClear
            prefix={<Search className="size-3.5 text-gray-400" />}
            placeholder="모음명 검색"
            value={groupSearch}
            onChange={(e) => setGroupSearch(e.target.value)}
            style={{ flex: 1 }}
          />
          <Button type="primary" icon={<Plus className="size-3.5" />} onClick={() => setFormState({ open: true, mode: 'create' })}>
            등록
          </Button>
        </div>

        {/* 목록 */}
        <div className="border border-gray-200 rounded-md overflow-hidden">
          {groupsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Spin size="small" />
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-xs text-gray-400">
              {groupSearch.trim() ? `'${groupSearch}' 에 맞는 스킬모음이 없습니다` : '등록된 스킬모음이 없습니다'}
            </div>
          ) : (
            filteredGroups.map((g) => (
              <div key={g.skillGroupId} className="flex items-center gap-2.5 px-3 py-2.5 border-b border-gray-100 last:border-b-0 text-xs hover:bg-[#fafbfd] transition">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-800 truncate">{g.skillGroupName}</div>
                  {g.skillGroupDesc && <div className="text-[11px] text-gray-400 truncate mt-0.5">{g.skillGroupDesc}</div>}
                </div>
                <span className="flex-shrink-0 text-[11px] text-gray-400 whitespace-nowrap">스킬 {g.memberCount}건</span>
                <span className="inline-flex gap-0.5 flex-shrink-0">
                  <button
                    type="button"
                    title="수정"
                    onClick={() => setFormState({ open: true, mode: 'edit', row: g })}
                    className="w-[28px] h-[28px] flex items-center justify-center rounded text-gray-400 hover:text-[#405189] hover:bg-gray-100 transition"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    title="삭제"
                    onClick={() => handleDelete(g)}
                    className="w-[28px] h-[28px] flex items-center justify-center rounded text-gray-400 hover:text-red-600 hover:bg-gray-100 transition"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </span>
              </div>
            ))
          )}
        </div>
      </Drawer>

      {/* 2차 드로어: 모음 등록/수정 */}
      <SkillGroupFormDrawer state={formState} tenantId={tenantIdParam} onClose={() => setFormState({ open: false })} />
    </>
  );
}
