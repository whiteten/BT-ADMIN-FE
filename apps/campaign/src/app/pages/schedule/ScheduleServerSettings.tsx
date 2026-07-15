import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { type BreadcrumbProps, Button } from 'antd';
import { Minus, Plus, Save } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { createUUID, toast } from '@/shared-util';
import ScheduleServerDetailForm, { type ScheduleServerDetailFormRef } from '../../features/schedule/components/ScheduleServerDetailForm';
import ScheduleServerGrid from '../../features/schedule/components/ScheduleServerGrid';
import { DEFAULT_SCHEDULE_SERVER_PORT, SCHEDULE_SERVER_ACTIVE, SCHEDULE_SERVER_PROTOCOL } from '../../features/schedule/constants/scheduleServerConstants';
import type { ScheduleServerFormValues, ScheduleServerItem } from '../../features/schedule/types';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '스케줄', path: '/campaign/schedule' },
  { title: '스케줄 관리', path: '/campaign/schedule/schedule-management' },
  { title: '스케줄서버 설정', path: '/campaign/schedule/schedule-server-settings' },
];

function getNextServerCategory(servers: ScheduleServerItem[]) {
  const maxCategory = servers.reduce((max, server) => Math.max(max, Number(server.serverCategory) || 0), 0);
  return String(maxCategory + 1);
}

function toFormValues(server: ScheduleServerItem): ScheduleServerFormValues {
  return {
    serverCategory: server.serverCategory,
    serverIp: server.serverIp,
    hostName: server.hostName,
    serverPort: server.serverPort,
    protocol: server.protocol,
  };
}

function createEmptyFormValues(): ScheduleServerFormValues {
  return {
    serverCategory: '',
    serverIp: '',
    hostName: '',
    serverPort: DEFAULT_SCHEDULE_SERVER_PORT,
    protocol: SCHEDULE_SERVER_PROTOCOL.HTTP,
  };
}

export default function ScheduleServerSettings() {
  const navigate = useNavigate();
  const modal = useModal();
  const formRef = useRef<ScheduleServerDetailFormRef>(null);
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  const [serverList, setServerList] = useState<ScheduleServerItem[]>([]);
  const [editingServerId, setEditingServerId] = useState<string | null>(null);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [selectedServerIds, setSelectedServerIds] = useState<string[]>([]);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  useEffect(() => {
    formRef.current?.resetForm(createEmptyFormValues());
  }, []);

  const handleAdd = () => {
    if (!editingServerId && formRef.current?.isEmptyForm()) {
      modal.show.info('수동으로 추가할 경우 스케줄서버 상세에 신규 스케줄 서버를 입력한 후 저장하세요.');
      return;
    }

    setEditingServerId(null);
    setSelectedServerId(null);
    formRef.current?.resetForm(createEmptyFormValues());
  };

  const handleDelete = () => {
    if (selectedServerIds.length === 0) {
      toast.warning('삭제할 스케줄서버를 선택해주세요.');
      return;
    }

    modal.confirm.delete({
      options: {
        title: '스케줄서버 삭제',
        content: `선택한 ${selectedServerIds.length}건의 스케줄서버를 삭제하시겠습니까?`,
      },
      onOk: () => {
        setServerList((prev) => {
          const next = prev.filter((server) => !selectedServerIds.includes(server.serverId));
          if (next.length === 0) {
            setEditingServerId(null);
            setSelectedServerId(null);
            formRef.current?.resetForm(createEmptyFormValues());
            return next;
          }

          if (selectedServerId && selectedServerIds.includes(selectedServerId)) {
            setSelectedServerId(null);
            setEditingServerId(null);
            formRef.current?.resetForm(createEmptyFormValues());
          }

          return next;
        });
        setSelectedServerIds([]);
        toast.success('스케줄서버가 삭제되었습니다. (백엔드 연동 전)');
      },
    });
  };

  const handleToolbarSave = () => {
    if (selectedServerIds.length === 0) {
      toast.warning('액티브 설정할 스케줄서버를 선택해주세요.');
      return;
    }

    modal.confirm.execute({
      options: {
        title: '액티브 설정',
        content: '선택한 항목을 액티브 설정하시겠습니까?',
        okText: '확인',
      },
      onOk: () => {
        setServerList((prev) => prev.map((server) => (selectedServerIds.includes(server.serverId) ? { ...server, active: SCHEDULE_SERVER_ACTIVE.YES } : server)));
        toast.success('선택한 스케줄서버가 액티브로 설정되었습니다. (백엔드 연동 전)');
      },
    });
  };

  const handleSave = (values: ScheduleServerFormValues) => {
    if (editingServerId) {
      setServerList((prev) =>
        prev.map((server) =>
          server.serverId === editingServerId
            ? {
                ...server,
                serverIp: values.serverIp.trim(),
                hostName: values.hostName?.trim() ?? '',
                serverPort: values.serverPort,
                protocol: values.protocol,
              }
            : server,
        ),
      );
      toast.success('스케줄서버가 수정되었습니다. (백엔드 연동 전)');
      return;
    }

    const newServer: ScheduleServerItem = {
      serverId: createUUID(),
      serverCategory: '',
      active: SCHEDULE_SERVER_ACTIVE.YES,
      hostName: values.hostName?.trim() ?? '',
      serverIp: values.serverIp.trim(),
      serverPort: values.serverPort,
      protocol: values.protocol,
    };

    setServerList((prev) => {
      const nextCategory = getNextServerCategory(prev);
      const createdServer = { ...newServer, serverCategory: nextCategory };
      formRef.current?.resetForm(createEmptyFormValues());
      return [...prev, createdServer];
    });
    setSelectedServerId(null);
    setEditingServerId(null);
    toast.success('스케줄서버가 추가되었습니다. (백엔드 연동 전)');
  };

  const handleRowClick = (item: ScheduleServerItem) => {
    setSelectedServerId(item.serverId);
    setEditingServerId(item.serverId);
    formRef.current?.resetForm(toFormValues(item));
  };

  const handleClose = () => {
    navigate('../schedule-management');
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex flex-col gap-4 w-full bg-white bt-shadow p-5">
        <header className="flex items-center justify-between w-full gap-2">
          <h2 className="text-base font-semibold text-gray-800">스케줄서버</h2>
          <div className="flex items-center gap-2">
            <Button type="primary" icon={<Plus className="size-4" />} onClick={handleAdd} aria-label="스케줄서버 추가" />
            <Button type="primary" icon={<Minus className="size-4" />} onClick={handleDelete} aria-label="스케줄서버 삭제" />
            <Button type="primary" icon={<Save className="size-4" />} onClick={handleToolbarSave} aria-label="스케줄서버 액티브 설정" />
          </div>
        </header>

        <ScheduleServerGrid rowData={serverList} selectedServerId={selectedServerId} onRowClick={handleRowClick} onSelectionChange={setSelectedServerIds} />
      </div>

      <div className="flex flex-col gap-5 w-full bg-white bt-shadow p-5">
        <h2 className="text-base font-semibold text-gray-800">스케줄서버 상세</h2>
        <ScheduleServerDetailForm ref={formRef} onSave={handleSave} onClose={handleClose} />
      </div>
    </div>
  );
}
