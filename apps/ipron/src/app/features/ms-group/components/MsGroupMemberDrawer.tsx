/**
 * MS그룹 멤버관리 Drawer (680px)
 * forwardRef + useImperativeHandle 패턴
 *
 * 해당 노드의 전체 미디어서버 목록을 체크박스 리스트로 표시하고,
 * 체크된 항목에 우선순위(0~999)를 설정하여 일괄 저장 (delete all + bulk insert)
 * 미디어서버명 클릭 → 수정 Drawer, 삭제 버튼 → 미디어서버 삭제
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Button, Checkbox, Drawer, InputNumber, Modal, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from '@/shared-util';
import MediaServerDrawer, { type MediaServerDrawerRef } from './MediaServerDrawer';
import { msGroupApi } from '../api/msGroupApi';
import { useDeleteMediaServer, useUpdateMsGroupMembers } from '../hooks/useMsGroupQueries';
import type { MediaServer, MsGroup, MsGroupMember } from '../types';

export interface MsGroupMemberDrawerRef {
  open: (msGroup: MsGroup) => void;
  close: () => void;
}

interface Props {
  onSuccess: () => void;
}

interface MemberRow {
  mediaServerId: number;
  mediaServerName: string;
  ipAddr: string;
  portNo: number;
  assigned: boolean;
  priority: number;
}

const MsGroupMemberDrawer = forwardRef<MsGroupMemberDrawerRef, Props>(({ onSuccess }, ref) => {
  const [visible, setVisible] = useState(false);
  const [editMode, setEditMode] = useState(false); // 수정 Drawer 열림 여부
  const [msGroup, setMsGroup] = useState<MsGroup | null>(null);
  const [memberRows, setMemberRows] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(false);
  const mediaServerDrawerRef = useRef<MediaServerDrawerRef>(null);

  useImperativeHandle(ref, () => ({
    open: (group: MsGroup) => {
      setMsGroup(group);
      setVisible(true);
    },
    close: () => {
      setVisible(false);
      setMsGroup(null);
      setMemberRows([]);
    },
  }));

  const fetchMembers = useCallback(() => {
    if (!msGroup) return;
    setLoading(true);
    msGroupApi
      .getMsGroupMembers({ id: msGroup.msGroupId })
      .then((members: MsGroupMember[]) => {
        setMemberRows(
          members.map((m) => ({
            mediaServerId: m.mediaServerId,
            mediaServerName: m.mediaServerName,
            ipAddr: m.ipAddr ?? '',
            portNo: m.portNo ?? 0,
            assigned: m.assigned,
            priority: m.priority,
          })),
        );
      })
      .catch(() => {
        toast.error('멤버 목록을 불러오지 못했습니다.');
        setMemberRows([]);
      })
      .finally(() => setLoading(false));
  }, [msGroup]);

  // Fetch member data when drawer opens
  useEffect(() => {
    if (visible && msGroup) {
      fetchMembers();
    }
  }, [visible, msGroup, fetchMembers]);

  const { mutate: updateMembers, isPending } = useUpdateMsGroupMembers({
    mutationOptions: {
      onSuccess: () => {
        toast.success('MS그룹 멤버가 저장되었습니다.');
        setVisible(false);
        setMsGroup(null);
        setMemberRows([]);
        onSuccess();
      },
    },
  });

  const { mutate: deleteMediaServer } = useDeleteMediaServer({
    mutationOptions: {
      onSuccess: () => {
        toast.success('미디어서버가 삭제되었습니다.');
        fetchMembers(); // 목록 새로고침
        onSuccess();
      },
    },
  });

  const handleToggleAssign = useCallback((mediaServerId: number) => {
    setMemberRows((prev) =>
      prev.map((row) => (row.mediaServerId === mediaServerId ? { ...row, assigned: !row.assigned, priority: !row.assigned ? row.priority || 0 : row.priority } : row)),
    );
  }, []);

  const handlePriorityChange = useCallback((mediaServerId: number, priority: number | null) => {
    setMemberRows((prev) => prev.map((row) => (row.mediaServerId === mediaServerId ? { ...row, priority: priority ?? 0 } : row)));
  }, []);

  const handleSubmit = useCallback(() => {
    if (!msGroup) return;

    const assignedMembers = memberRows.filter((row) => row.assigned);
    updateMembers({
      id: msGroup.msGroupId,
      data: {
        members: assignedMembers.map((row) => ({
          mediaServerId: row.mediaServerId,
          priority: row.priority,
        })),
      },
    });
  }, [msGroup, memberRows, updateMembers]);

  const handleEditMediaServer = useCallback(async (record: MemberRow) => {
    try {
      const detail = await msGroupApi.getMediaServerDetail({ id: record.mediaServerId });
      setEditMode(true);
      mediaServerDrawerRef.current?.open(detail);
    } catch {
      toast.error('미디어서버 정보를 불러오지 못했습니다.');
    }
  }, []);

  const handleDeleteMediaServer = useCallback(
    (record: MemberRow) => {
      Modal.confirm({
        title: '미디어서버 삭제',
        content: `"${record.mediaServerName}" 미디어서버를 삭제하시겠습니까?\nMS그룹에 할당되어 있으면 삭제할 수 없습니다.`,
        okText: '삭제',
        cancelText: '취소',
        okButtonProps: { danger: true },
        onOk: () => deleteMediaServer({ id: record.mediaServerId }),
      });
    },
    [deleteMediaServer],
  );

  const handleMediaServerDrawerSuccess = useCallback(() => {
    setEditMode(false);
    fetchMembers();
    onSuccess();
  }, [fetchMembers, onSuccess]);

  const columns: ColumnsType<MemberRow> = [
    {
      title: '',
      dataIndex: 'assigned',
      width: 45,
      render: (assigned: boolean, record) => <Checkbox checked={assigned} onChange={() => handleToggleAssign(record.mediaServerId)} />,
    },
    {
      title: '미디어서버명',
      dataIndex: 'mediaServerName',
      ellipsis: true,
    },
    {
      title: 'IP 주소',
      dataIndex: 'ipAddr',
      width: 140,
      ellipsis: true,
    },
    {
      title: '우선순위',
      dataIndex: 'priority',
      width: 100,
      render: (priority: number, record) => (
        <InputNumber
          min={0}
          max={999}
          value={record.assigned ? priority : undefined}
          disabled={!record.assigned}
          onChange={(val) => handlePriorityChange(record.mediaServerId, val)}
          className="!w-full"
          size="small"
          placeholder="0~999"
        />
      ),
    },
    {
      title: '',
      width: 70,
      render: (_: unknown, record) => (
        <div className="flex items-center gap-1">
          <button type="button" className="p-1 rounded hover:bg-gray-100 transition-colors" title="수정" onClick={() => handleEditMediaServer(record)}>
            <Pencil className="size-3.5 text-gray-500" />
          </button>
          <button type="button" className="p-1 rounded hover:bg-red-50 transition-colors" title="삭제" onClick={() => handleDeleteMediaServer(record)}>
            <Trash2 className="size-3.5 text-red-500" />
          </button>
        </div>
      ),
    },
  ];

  const assignedCount = memberRows.filter((r) => r.assigned).length;

  return (
    <>
      <Drawer
        title={msGroup ? `MS그룹 멤버관리 - ${msGroup.msGroupName}` : 'MS그룹 멤버관리'}
        closable={{ placement: 'end' }}
        open={visible && !editMode}
        onClose={() => {
          setVisible(false);
          setMsGroup(null);
          setMemberRows([]);
        }}
        styles={{ wrapper: { width: 680 } }}
        footer={
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">선택: {assignedCount}개</span>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setVisible(false);
                  setMsGroup(null);
                  setMemberRows([]);
                }}
              >
                취소
              </Button>
              <Button type="primary" onClick={handleSubmit} loading={isPending}>
                저장
              </Button>
            </div>
          </div>
        }
      >
        <Table dataSource={memberRows} columns={columns} rowKey="mediaServerId" loading={loading} pagination={false} size="small" scroll={{ y: 'calc(100vh - 280px)' }} />
      </Drawer>

      {/* 미디어서버 수정 Drawer — 멤버관리를 숨기고 단독으로 열림 */}
      <MediaServerDrawer ref={mediaServerDrawerRef} onSuccess={handleMediaServerDrawerSuccess} onClose={() => setEditMode(false)} />
    </>
  );
});

MsGroupMemberDrawer.displayName = 'MsGroupMemberDrawer';
export default MsGroupMemberDrawer;
