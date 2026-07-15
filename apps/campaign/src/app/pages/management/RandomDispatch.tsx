import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { type BreadcrumbProps, Button } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import CallerNumberGrid from '../../features/management/components/CallerNumberGrid';
import type { CallerNumberListItem } from '../../features/management/types/callerNumber';

export default function RandomDispatch() {
  const navigate = useNavigate();
  const { scenarioId } = useParams();
  const scenario = scenarioId ? { scenarioId, scenarioName: '-', callerNumber: '' } : undefined;
  const callerNumberList: CallerNumberListItem[] = [];
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  const [currentCallerNumber, setCurrentCallerNumber] = useState('');
  const [selectedCallerNumberId, setSelectedCallerNumberId] = useState<string | null>(null);

  useEffect(() => {
    setCurrentCallerNumber(scenario?.callerNumber ?? '');
  }, [scenario?.callerNumber]);

  useEffect(() => {
    const breadcrumb: BreadcrumbProps['items'] = [
      { title: '관리', path: '/campaign/management' },
      { title: '캠페인 시나리오', path: '/campaign/management/campaign-scenario' },
      { title: '발신번호 관리', path: `/campaign/management/campaign-scenario/random-dispatch/${scenarioId}` },
    ];
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [scenarioId, setBreadcrumb, clearBreadcrumb]);

  const handleConfigure = () => {
    if (!selectedCallerNumberId) {
      toast.warning('설정할 발신번호를 선택하세요.');
      return;
    }

    const selectedCaller = callerNumberList.find((item) => item.callerNumberId === selectedCallerNumberId);
    if (!selectedCaller) return;

    setCurrentCallerNumber(selectedCaller.callerNumber);
    toast.success('발신번호가 설정되었습니다. (백엔드 연동 전)');
  };

  const handleClose = () => {
    navigate('/campaign/management/campaign-scenario');
  };

  if (!scenario) {
    return (
      <div className="flex flex-col gap-4 w-full h-full">
        <div className="flex flex-col items-center justify-center gap-4 w-full h-full bg-white bt-shadow p-5">
          <p className="text-sm text-[#868e96]">시나리오 정보를 찾을 수 없습니다.</p>
          <Button onClick={handleClose}>닫기</Button>
        </div>
      </div>
    );
  }

  const currentCallerNumberLabel = currentCallerNumber.trim() ? currentCallerNumber : '발신번호가 설정되지 않았습니다.';

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex flex-col gap-5 w-full h-full bg-white bt-shadow p-5">
        <h2 className="text-base font-semibold text-gray-800">발신번호 관리</h2>

        <section className="flex flex-col gap-2 w-full rounded bg-[#f1f3f5] px-5 py-4 text-sm text-[#495057]">
          <p>
            <span className="font-medium">선택된 시나리오 :</span> {scenario.scenarioName}
          </p>
          <p>
            <span className="font-medium">현재 발신번호 :</span> {currentCallerNumberLabel}
          </p>
        </section>

        <div className="flex flex-col gap-3 w-full flex-1 min-h-0">
          <h3 className="text-sm font-medium text-[#495057]">발신번호 목록</h3>
          <CallerNumberGrid rowData={callerNumberList} selectedCallerNumberId={selectedCallerNumberId} onRowSelect={setSelectedCallerNumberId} />
        </div>

        <footer className="flex items-center justify-center gap-2 w-full pt-2">
          <Button type="primary" onClick={handleConfigure}>
            설정
          </Button>
          <Button onClick={handleClose}>닫기</Button>
        </footer>
      </div>
    </div>
  );
}
