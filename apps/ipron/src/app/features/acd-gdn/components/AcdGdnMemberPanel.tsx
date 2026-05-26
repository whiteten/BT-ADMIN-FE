/**
 * ACD 그룹DN 우측 멤버 패널 (개선⑤ — popup → 사이드 인라인).
 *
 * 표시:
 *  - 선택된 그룹DN 의 기배정 멤버 목록 (DN 번호 + 노드 + 우선순위 인라인 input)
 *  - 우선순위 변경 후 [저장] → i/u/d 분류 후 saveMembers 호출
 *  - ACD_TYPE=3 인 경우 안내 후 편집 비활성
 */
import { useEffect, useMemo, useState } from 'react';
import { Button, Empty, InputNumber } from 'antd';
import { Save, Users } from 'lucide-react';
import { toast } from '@/shared-util';
import { useGetAcdGdnMembers, useSaveAcdGdnMembers } from '../hooks/useAcdGdnQueries';
import type { GdnMemberItem, GdnResponse } from '../types';

interface AcdGdnMemberPanelProps {
  selectedGdn: GdnResponse | null;
}

interface EditableRow {
  dnId: number;
  dnNo: string | null;
  nodeId: number | null;
  priority: number | null;
  channelLimit: number | null;
  originalPriority: number | null;
}

export default function AcdGdnMemberPanel({ selectedGdn }: AcdGdnMemberPanelProps) {
  const gdnId = selectedGdn?.gdnId ?? null;
  const isSkillType = selectedGdn?.acdType === 3;

  const { data: members = [], isLoading } = useGetAcdGdnMembers(gdnId);
  const [rows, setRows] = useState<EditableRow[]>([]);

  // members 로드 시 편집 가능한 행으로 변환
  useEffect(() => {
    setRows(
      members
        .filter((m) => m.dnId != null)
        .map((m) => ({
          dnId: m.dnId as number,
          dnNo: m.dnNo,
          nodeId: m.nodeId,
          priority: m.memberPriority,
          channelLimit: m.channelLimitCount,
          originalPriority: m.memberPriority,
        })),
    );
  }, [members]);

  const dirtyCount = useMemo(() => rows.filter((r) => r.priority !== r.originalPriority).length, [rows]);

  const { mutate: saveMembers, isPending: isSaving } = useSaveAcdGdnMembers({
    mutationOptions: {
      onSuccess: () => toast.success('멤버 우선순위가 저장되었습니다'),
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '저장 실패';
        toast.error(msg);
      },
    },
  });

  const handleSave = () => {
    if (!gdnId) return;
    if (isSkillType) {
      toast.warning('ACD 타입 = Skill 인 그룹DN 은 멤버를 수동 관리할 수 없습니다.');
      return;
    }
    const updates: GdnMemberItem[] = rows
      .filter((r) => r.priority !== r.originalPriority)
      .map((r) => ({ dnId: r.dnId, memberPriority: r.priority ?? 0, channelLimitCount: r.channelLimit }));
    if (updates.length === 0) {
      toast.info('변경사항이 없습니다');
      return;
    }
    saveMembers({ id: gdnId, body: { updates } });
  };

  if (!selectedGdn) {
    return (
      <div className="bg-white bt-shadow flex flex-col h-full">
        <div className="px-4 h-[44px] border-b border-gray-100 flex items-center gap-2">
          <Users className="size-4 text-gray-400" />
          <span className="text-sm font-semibold text-gray-700">DN 멤버</span>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">좌측 그룹DN 을 선택하세요</div>
      </div>
    );
  }

  return (
    <div className="bg-white bt-shadow flex flex-col h-full">
      {/* Header */}
      <div className="px-4 h-[44px] border-b border-gray-100 flex items-center gap-2 flex-shrink-0">
        <Users className="size-4 text-[#405189]" />
        <span className="text-sm font-semibold text-gray-700">DN 멤버</span>
        <span className="text-xs text-gray-500">
          {selectedGdn.gdnNo} / {selectedGdn.gdnName}
        </span>
        <span className="ml-auto text-xs text-gray-400">{rows.length}건</span>
      </div>

      {/* Body */}
      {isSkillType ? (
        <div className="flex-1 flex items-center justify-center text-amber-700 text-xs px-4 text-center">
          ACD 타입 = Skill 인 그룹DN 은
          <br />
          멤버를 수동 관리할 수 없습니다
          <br />
          (로그인 상담사 자동 결정)
        </div>
      ) : (
        <div className="flex-1 overflow-auto min-h-[300px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-[200px] text-gray-400 text-sm">로딩중…</div>
          ) : rows.length === 0 ? (
            <div className="flex items-center justify-center h-[200px]">
              <Empty description="배정된 멤버가 없습니다" imageStyle={{ height: 40 }} />
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 h-8 text-left text-gray-600 font-semibold border-b">DN 번호</th>
                  <th className="px-3 h-8 text-left text-gray-600 font-semibold border-b w-[80px]">노드</th>
                  <th className="px-3 h-8 text-right text-gray-600 font-semibold border-b w-[100px]">우선순위</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => {
                  const dirty = r.priority !== r.originalPriority;
                  return (
                    <tr key={r.dnId} className={`border-b border-gray-50 hover:bg-gray-50 ${dirty ? 'bg-amber-50/40' : ''}`}>
                      <td className="px-3 h-9 font-mono text-gray-800">{r.dnNo ?? `(DN_ID:${r.dnId})`}</td>
                      <td className="px-3 h-9 text-gray-500">{r.nodeId ?? '-'}</td>
                      <td className="px-3 h-9 text-right">
                        <InputNumber
                          size="small"
                          min={0}
                          value={r.priority ?? 0}
                          onChange={(v) =>
                            setRows((prev) => {
                              const copy = [...prev];
                              copy[idx] = { ...copy[idx], priority: v ?? 0 };
                              return copy;
                            })
                          }
                          style={{ width: 70 }}
                          controls={false}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="px-3 py-2 border-t border-gray-100 flex items-center gap-2 flex-shrink-0">
        <span className="text-xs text-gray-500">{dirtyCount > 0 ? <span className="text-amber-600">변경 {dirtyCount}건</span> : '변경사항 없음'}</span>
        <Button
          type="primary"
          size="small"
          icon={<Save className="size-3" />}
          onClick={handleSave}
          loading={isSaving}
          disabled={isSkillType || dirtyCount === 0}
          className="ml-auto"
        >
          저장
        </Button>
      </div>
    </div>
  );
}
