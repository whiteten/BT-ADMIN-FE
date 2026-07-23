/**
 * 조직 일괄변경 Dialog (AS-IS IPR20S2055_UserGroupUpdate 팝업).
 * 체크된 다수 사용자 → 대상 조직 선택 → DN_GROUP_ID 일괄 변경.
 */
import { useMemo, useState } from 'react';
import { Button, Modal, TreeSelect } from 'antd';
import { toast } from '@/shared-util';
import { useGetIptOrgTree } from '../../ipt-org/hooks/useIptOrgQueries';
import type { IptOrgTreeNode } from '../../ipt-org/types';
import { useMoveIptUserGroup } from '../hooks/useIptUserQueries';
import type { IptUserResponse } from '../types';

interface GroupMoveDialogProps {
  open: boolean;
  tenantId: number | null;
  users: IptUserResponse[];
  onClose: () => void;
}

function toTreeData(nodes: IptOrgTreeNode[]): { value: number; title: string; children?: ReturnType<typeof toTreeData> }[] {
  return nodes.map((n) => ({
    value: n.dnGroupId,
    title: n.dnGrpName,
    children: n.children?.length ? toTreeData(n.children) : undefined,
  }));
}

export default function GroupMoveDialog({ open, tenantId, users, onClose }: GroupMoveDialogProps) {
  const [targetOrgId, setTargetOrgId] = useState<number | null>(null);

  // 대상 테넌트로 서버 스코프 — 관리자 계정이 일반 콘솔에서 전 테넌트 트리를 받는 것 방지 (클라 필터는 이중 안전망)
  const { data: orgTree = [] } = useGetIptOrgTree({ params: { tenantId: tenantId ?? undefined }, queryOptions: { enabled: open } });
  const treeData = useMemo(() => toTreeData(orgTree.filter((n) => tenantId == null || n.tenantId === tenantId)), [orgTree, tenantId]);

  const { mutate: moveGroup, isPending } = useMoveIptUserGroup({
    mutationOptions: {
      onSuccess: () => {
        toast.success(`${users.length}명의 조직이 변경되었습니다.`);
        setTargetOrgId(null);
        onClose();
      },
    },
  });

  // 전원이 이미 대상 조직 소속이면 변경 의미 없음
  const allSameOrg = targetOrgId != null && users.every((u) => u.dnGroupId === targetOrgId);

  const handleOk = () => {
    if (targetOrgId == null) {
      toast.error('대상 조직을 선택하세요.');
      return;
    }
    if (allSameOrg) {
      toast.warning('선택한 사용자 전원이 이미 해당 조직 소속입니다.');
      return;
    }
    moveGroup({ dnGroupId: targetOrgId, ieUserIds: users.map((u) => u.ieUserid) });
  };

  return (
    <Modal
      title={`조직 일괄변경 (${users.length}명)`}
      open={open}
      onCancel={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>취소</Button>
          <Button type="primary" loading={isPending} onClick={handleOk}>
            변경
          </Button>
        </div>
      }
    >
      <div className="mb-3 max-h-28 overflow-auto rounded bg-gray-50 px-3 py-2 text-[12.5px] text-gray-600">{users.map((u) => `${u.userName}(${u.userId})`).join(', ')}</div>
      <TreeSelect
        className="w-full"
        treeData={treeData}
        showSearch
        treeNodeFilterProp="title"
        treeDefaultExpandAll
        placeholder="대상 조직 선택"
        value={targetOrgId ?? undefined}
        onChange={(v) => setTargetOrgId(v ?? null)}
      />
    </Modal>
  );
}
