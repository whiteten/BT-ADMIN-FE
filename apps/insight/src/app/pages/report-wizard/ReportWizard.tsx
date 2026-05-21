import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Steps } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import WizardStepA from '../../features/dataset/components/WizardStepA';
import WizardStepB from '../../features/dataset/components/WizardStepB';
import WizardStepC from '../../features/dataset/components/WizardStepC';
import { useCreateReport } from '../../features/report/hooks/useReportQueries';
import type { DomainCode, ReportIconType } from '../../features/report/types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

type WizardStep = 'A' | 'B' | 'C';

const STEP_ITEMS = [{ title: '이름' }, { title: '카테고리' }, { title: '데이터 뷰' }, { title: '데이터셋 편집' }];

export default function ReportWizard() {
  const navigate = useNavigate();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  const [step, setStep] = useState<WizardStep>('A');
  const [createdReportId, setCreatedReportId] = useState<number | null>(null);

  const [title, setTitle] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<DomainCode | null>(null);
  const [selectedIcon, setSelectedIcon] = useState<ReportIconType | null>(null);
  const [selectedView, setSelectedView] = useState('');
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    setBreadcrumb([{ title: '인사이트' }, { title: '보고서', path: '/insight/statistics/reports' }, { title: '새 보고서 생성', path: '/insight/statistics/reports/new' }]);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const { mutate: createReport, isPending } = useCreateReport({
    mutationOptions: {
      onSuccess: (report) => {
        setCreatedReportId(report.reportId);
        setStep('B');
      },
    },
  });

  const handleNext = () => {
    if (step === 'A') {
      if (!title.trim() || !selectedDomain || !selectedIcon || !selectedView) {
        setShowErrors(true);
        if (!title.trim()) toast.error('보고서 이름을 입력하세요.');
        else if (!selectedDomain) toast.error('카테고리를 선택하세요.');
        else if (!selectedIcon) toast.error('아이콘을 선택하세요.');
        else toast.error('데이터 뷰를 선택하세요.');
        return;
      }
      setShowErrors(false);
      createReport({ title: title.trim(), domain: selectedDomain, datasourceKey: selectedView, iconType: selectedIcon });
    } else if (step === 'B') {
      setStep('C');
    }
  };

  const handlePrev = () => {
    if (step === 'B') setStep('A');
    else if (step === 'C') setStep('B');
  };

  const handleCancel = () => navigate('/insight/statistics/reports');
  const handleDone = () => {
    if (createdReportId) navigate(`/insight/statistics/reports/${createdReportId}/edit`);
  };

  const handleDomainChange = (domain: DomainCode) => {
    setSelectedDomain(domain);
    setSelectedView('');
  };

  // Steps 현재 인덱스 — Step A 내 진행도 반영
  const titleDone = !!title.trim();
  const domainDone = !!selectedDomain;
  const viewDone = !!selectedView;
  const stepsCurrentA = !titleDone ? 0 : !domainDone ? 1 : !viewDone ? 2 : 3;
  const stepsCurrent = step === 'A' ? stepsCurrentA : step === 'B' ? 3 : 4;

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* Steps 헤더 — UserCreate와 동일한 패턴 */}
      <div className="flex items-center justify-center w-full min-h-[58px] bg-white bt-shadow px-7 py-2">
        <Steps current={stepsCurrent} size="small" responsive={false} items={STEP_ITEMS} className="max-w-2xl w-full" />
      </div>

      {/* 메인 카드 */}
      <div className="flex w-full flex-1 min-h-0">
        <div className="w-full h-full min-h-0 bg-white bt-shadow flex flex-col">
          {/* 콘텐츠 */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {isPending ? (
              <FallbackSpinner />
            ) : (
              <>
                {step === 'A' && (
                  <WizardStepA
                    title={title}
                    onTitleChange={setTitle}
                    selectedDomain={selectedDomain}
                    onDomainChange={handleDomainChange}
                    selectedIcon={selectedIcon}
                    onIconChange={setSelectedIcon}
                    selectedView={selectedView}
                    onViewChange={setSelectedView}
                    showErrors={showErrors}
                  />
                )}
                {step === 'B' && createdReportId && <WizardStepB reportId={createdReportId} />}
                {step === 'C' && createdReportId && <WizardStepC reportId={createdReportId} />}
              </>
            )}
          </div>

          {/* 하단 버튼 — UserCreate와 동일한 패턴 */}
          <div className="border-t border-bt-border bg-bt-bg-muted px-7 py-4">
            <div className="flex items-center justify-between">
              <Button onClick={handleCancel}>취소</Button>
              <div className="flex items-center gap-2">
                {step !== 'A' && <Button onClick={handlePrev}>이전</Button>}
                {step !== 'C' && (
                  <Button type="primary" onClick={handleNext} loading={isPending}>
                    {step === 'A' ? '다음 → 데이터셋 편집' : '다음 → 확인'}
                  </Button>
                )}
                {step === 'C' && (
                  <Button type="primary" onClick={handleDone}>
                    캔버스로 이동
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
