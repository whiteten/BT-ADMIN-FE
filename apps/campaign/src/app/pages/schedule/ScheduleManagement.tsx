import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { type BreadcrumbProps, Button } from 'antd';
import { Plus, Search, Settings, Trash2 } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import ScheduleManagementGrid from '../../features/schedule/components/ScheduleManagementGrid';
import type { ScheduleManagementItem } from '../../features/schedule/types';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '스케줄', path: '/campaign/schedule' },
  { title: '캠페인 스케줄 관리', path: '/campaign/schedule/schedule-management' },
];

const SCHEDULE_CONTROL_BUTTON_CLASS = '!bg-[#0ab39c] !border-[#0ab39c] hover:!bg-[#099885] hover:!border-[#099885] !text-white';

const EMPTY_SCHEDULE_LIST: ScheduleManagementItem[] = [];

export default function ScheduleManagement() {
  const navigate = useNavigate();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  const modal = useModal();

  const [selectedScheduleIds, setSelectedScheduleIds] = useState<string[]>([]);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const handleSearch = () => {
    setSelectedScheduleIds([]);
  };

  const handleSettings = () => {
    navigate('../schedule-server-settings');
  };

  const handleScheduleControl = (action: string) => {
    toast.info(`${action} 기능은 준비 중입니다.`);
  };

  const handleAdd = () => {
    navigate('../create');
  };

  const handleDelete = () => {
    modal.confirm.delete({
      options: {
        title: '스케줄 삭제',
        content: '선택한 스케줄을 삭제하시겠습니까?',
      },
      onOk: () => {
        toast.info('스케줄 삭제 기능은 준비 중입니다.');
      },
    });
  };

  const handleParameterManagement = () => {
    if (selectedScheduleIds.length === 0) {
      toast.warning('파라미터를 관리할 스케줄을 선택해주세요.');
      return;
    }
    if (selectedScheduleIds.length > 1) {
      toast.warning('파라미터 관리는 한 건씩만 선택할 수 있습니다.');
      return;
    }
    navigate(`parameter/${selectedScheduleIds[0]}`);
  };

  const handleDetailClick = (item: ScheduleManagementItem) => {
    navigate(item.scheduleId);
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex flex-col gap-5 w-full h-full bg-white bt-shadow p-5">
        <header className="flex items-center justify-between w-full gap-2 lg:flex-nowrap flex-wrap">
          <h2 className="text-base font-semibold text-gray-800 shrink-0">스케줄 목록</h2>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Button className={SCHEDULE_CONTROL_BUTTON_CLASS} icon={<Settings className="size-4" />} onClick={handleSettings}>
              설정
            </Button>
            <Button className={SCHEDULE_CONTROL_BUTTON_CLASS} onClick={() => handleScheduleControl('시작')}>
              시작
            </Button>
            <Button className={SCHEDULE_CONTROL_BUTTON_CLASS} onClick={() => handleScheduleControl('중지')}>
              중지
            </Button>
            <Button className={SCHEDULE_CONTROL_BUTTON_CLASS} onClick={() => handleScheduleControl('즉시실행')}>
              즉시실행
            </Button>
            <Button type="primary" icon={<Search className="size-4" />} onClick={handleSearch}>
              검색
            </Button>
            <Button type="primary" icon={<Plus className="size-4" />} onClick={handleAdd}>
              추가
            </Button>
            <Button type="primary" icon={<Trash2 className="size-4" />} onClick={handleDelete}>
              삭제
            </Button>
            <Button type="primary" onClick={handleParameterManagement}>
              파라미터관리
            </Button>
          </div>
        </header>

        <div className="w-full h-full">
          <ScheduleManagementGrid rowData={EMPTY_SCHEDULE_LIST} showSelection onDetailClick={handleDetailClick} onSelectionChange={setSelectedScheduleIds} />
        </div>
      </div>
    </div>
  );
}
