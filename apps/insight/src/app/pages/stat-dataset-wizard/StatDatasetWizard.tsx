import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Steps } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import WizardStepA from '../../features/dataset/components/WizardStepA';
import WizardStepB from '../../features/dataset/components/WizardStepB';
import { useCreateDataset } from '../../features/dataset/hooks/useDatasetQueries';
import type { LocalCalcFieldDraft, LocalFieldDisplay } from '../../features/dataset/types';
import type { DomainCode } from '../../features/report/types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

const STEP_ITEMS = [{ title: '이름' }, { title: '카테고리' }, { title: '데이터 뷰' }, { title: '컬럼 구성' }];

export default function StatDatasetWizard() {
  const navigate = useNavigate();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  const [wizardStep, setWizardStep] = useState<0 | 1>(0);
  const [showErrors, setShowErrors] = useState(false);

  const [datasetName, setDatasetName] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<DomainCode | null>(null);
  const [selectedPrefix, setSelectedPrefix] = useState('');

  const [fieldDisplays, setFieldDisplays] = useState<LocalFieldDisplay[]>([]);
  const [calcFields, setCalcFields] = useState<LocalCalcFieldDraft[]>([]);

  const { mutateAsync: createDataset, isPending } = useCreateDataset();

  useEffect(() => {
    setBreadcrumb([{ title: '인사이트' }, { title: '데이터셋', path: '/insight/statistics/datasets' }, { title: '새 데이터셋 생성', path: '/insight/statistics/datasets/new' }]);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const handleNext = () => {
    if (!datasetName.trim() || !selectedDomain || !selectedPrefix) {
      setShowErrors(true);
      if (!datasetName.trim()) toast.error('데이터셋 이름을 입력하세요.');
      else if (!selectedDomain) toast.error('카테고리를 선택하세요.');
      else toast.error('데이터 뷰를 선택하세요.');
      return;
    }
    setFieldDisplays([]);
    setWizardStep(1);
  };

  const handleSubmit = async () => {
    try {
      await createDataset({
        datasourceName: datasetName.trim(),
        productCode: selectedDomain ?? undefined,
        dbViewPrefix: selectedPrefix,
      });
      toast.success('데이터셋이 생성되었습니다.');
      navigate('/insight/statistics/datasets');
    } catch {
      toast.error('데이터셋 생성 중 오류가 발생했습니다.');
    }
  };

  const handleCancel = () => navigate('/insight/statistics/datasets');

  const handleDomainChange = (domain: DomainCode) => {
    setSelectedDomain(domain);
    setSelectedPrefix('');
  };

  const titleDone = !!datasetName.trim();
  const domainDone = !!selectedDomain;
  const prefixDone = !!selectedPrefix;
  const stepsCurrent = wizardStep === 1 ? 3 : !titleDone ? 0 : !domainDone ? 1 : !prefixDone ? 2 : 3;

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex items-center justify-center w-full min-h-[58px] bg-white bt-shadow px-7 py-2">
        <Steps current={stepsCurrent} size="small" responsive={false} items={STEP_ITEMS} className="max-w-xl w-full" />
      </div>

      <div className="flex w-full flex-1 min-h-0">
        <div className="w-full h-full min-h-0 bg-white bt-shadow flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto">
            {isPending ? (
              <FallbackSpinner />
            ) : wizardStep === 0 ? (
              <WizardStepA
                titleLabel="데이터셋 이름"
                title={datasetName}
                onTitleChange={setDatasetName}
                selectedDomain={selectedDomain}
                onDomainChange={handleDomainChange}
                selectedView={selectedPrefix}
                onViewChange={setSelectedPrefix}
                showErrors={showErrors}
                useCandidates
              />
            ) : (
              <WizardStepB
                dbViewPrefix={selectedPrefix}
                domain={selectedDomain!}
                fieldDisplays={fieldDisplays}
                onFieldDisplaysChange={setFieldDisplays}
                calcFields={calcFields}
                onCalcFieldsChange={setCalcFields}
              />
            )}
          </div>

          <div className="border-t border-bt-border bg-bt-bg-muted px-7 py-4">
            <div className="flex items-center justify-between">
              <Button onClick={wizardStep === 0 ? handleCancel : () => setWizardStep(0)}>{wizardStep === 0 ? '취소' : '이전'}</Button>
              {wizardStep === 0 ? (
                <Button type="primary" onClick={handleNext}>
                  다음
                </Button>
              ) : (
                <Button type="primary" onClick={handleSubmit} loading={isPending}>
                  완료
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
