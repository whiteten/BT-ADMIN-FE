import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Steps } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import WizardStepA from '../../features/dataset/components/WizardStepA';
import WizardStepB from '../../features/dataset/components/WizardStepB';
import type { LocalCalcFieldDraft, LocalFieldDisplay } from '../../features/dataset/types';
import { reportApi } from '../../features/report/api/reportApi';
import type { DomainCode, ReportIconType } from '../../features/report/types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

type WizardStep = 'A' | 'B';

const STEP_ITEMS = [{ title: '이름' }, { title: '카테고리' }, { title: '데이터 뷰' }, { title: '데이터셋 편집' }];

export default function ReportWizard() {
  const navigate = useNavigate();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  const [step, setStep] = useState<WizardStep>('A');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [title, setTitle] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<DomainCode | null>(null);
  const [selectedIcon, setSelectedIcon] = useState<ReportIconType | null>(null);
  const [selectedView, setSelectedView] = useState('');
  const [showErrors, setShowErrors] = useState(false);

  const [localFieldDisplays, setLocalFieldDisplays] = useState<LocalFieldDisplay[]>([]);
  const [localCalcFields, setLocalCalcFields] = useState<LocalCalcFieldDraft[]>([]);
  const [isEditingCalcField, setIsEditingCalcField] = useState(false);

  useEffect(() => {
    setBreadcrumb([{ title: '인사이트' }, { title: '보고서', path: '/insight/statistics/reports' }, { title: '새 보고서 생성', path: '/insight/statistics/reports/new' }]);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const handleNext = async () => {
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
      setStep('B');
      return;
    }

    if (step === 'B') {
      const visibleFields = localFieldDisplays.filter((f) => f.isVisible);
      if (visibleFields.length === 0) {
        toast.error('최소 1개 이상의 필드를 노출 설정해야 합니다.');
        return;
      }

      setIsSubmitting(true);
      try {
        await reportApi.createReport({
          title: title.trim(),
          domain: selectedDomain as DomainCode,
          datasourceKey: selectedView,
          iconType: selectedIcon ?? undefined,
        });
        toast.success('보고서가 생성되었습니다.');
        navigate('/insight/statistics/reports');
      } catch {
        toast.error('보고서 생성 중 오류가 발생했습니다.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handlePrev = () => {
    if (step === 'B') setStep('A');
  };

  const handleCancel = () => navigate('/insight/statistics/reports');

  const handleDomainChange = (domain: DomainCode) => {
    setSelectedDomain(domain);
    setSelectedView('');
    setLocalFieldDisplays([]);
  };

  const handleViewChange = (view: string) => {
    setLocalFieldDisplays([]);
    setLocalCalcFields([]);
  };

  const titleDone = !!title.trim();
  const domainDone = !!selectedDomain;
  const viewDone = !!selectedView;
  const stepsCurrentA = !titleDone ? 0 : !domainDone ? 1 : !viewDone ? 2 : 3;
  const stepsCurrent = step === 'A' ? stepsCurrentA : 3;

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex items-center justify-center w-full min-h-[58px] bg-white bt-shadow px-7 py-2">
        <Steps current={stepsCurrent} size="small" responsive={false} items={STEP_ITEMS} className="max-w-2xl w-full" />
      </div>

      <div className="flex w-full flex-1 min-h-0">
        <div className="w-full h-full min-h-0 bg-white bt-shadow flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto">
            {isSubmitting ? (
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
                    onViewChange={(v) => {
                      handleViewChange(v);
                      setSelectedView(v);
                    }}
                    showErrors={showErrors}
                  />
                )}
                {step === 'B' && selectedDomain && selectedView && (
                  <WizardStepB
                    datasourceKey={selectedView}
                    domain={selectedDomain}
                    fieldDisplays={localFieldDisplays}
                    onFieldDisplaysChange={setLocalFieldDisplays}
                    calcFields={localCalcFields}
                    onCalcFieldsChange={setLocalCalcFields}
                    onEditingChange={setIsEditingCalcField}
                  />
                )}
              </>
            )}
          </div>

          {!isEditingCalcField && (
            <div className="border-t border-bt-border bg-bt-bg-muted px-7 py-4">
              <div className="flex items-center justify-between">
                <Button onClick={handleCancel}>취소</Button>
                <div className="flex items-center gap-2">
                  {step !== 'A' && <Button onClick={handlePrev}>이전</Button>}
                  <Button type="primary" onClick={handleNext} loading={isSubmitting}>
                    {step === 'A' ? '다음 → 데이터셋 편집' : '완료 → 캔버스'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
