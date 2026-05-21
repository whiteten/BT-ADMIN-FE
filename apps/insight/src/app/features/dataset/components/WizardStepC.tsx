import { CheckCircle } from 'lucide-react';
import { useGetCalcFields, useGetFieldDisplays } from '../../report/hooks/useReportQueries';

interface WizardStepCProps {
  reportId: number;
}

export default function WizardStepC({ reportId }: WizardStepCProps) {
  const { data: fieldDisplays = [] } = useGetFieldDisplays({ params: { reportId } });
  const { data: calcFields = [] } = useGetCalcFields({ params: { reportId } });

  const visibleFields = fieldDisplays.filter((f) => f.isVisible);
  const dimCount = visibleFields.filter((f) => f.fieldType === 'DIM').length;
  const msrCount = visibleFields.filter((f) => f.fieldType === 'MSR').length;

  return (
    <div className="p-7 flex flex-col gap-5">
      <div className="rounded border border-bt-success bg-bt-success-soft p-5">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle className="w-5 h-5 text-bt-success" />
          <span className="text-base font-semibold text-bt-success">데이터셋 구성 완료</span>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="rounded border border-bt-border bg-white p-4">
            <div className="text-3xl font-bold text-bt-fg">{visibleFields.length}</div>
            <div className="text-sm text-bt-fg-muted mt-1">표시 필드</div>
          </div>
          <div className="rounded border border-bt-border bg-white p-4">
            <div className="text-3xl font-bold text-bt-primary">{dimCount}</div>
            <div className="text-sm text-bt-fg-muted mt-1">차원(DIM)</div>
          </div>
          <div className="rounded border border-bt-border bg-white p-4">
            <div className="text-3xl font-bold text-bt-fg">{msrCount}</div>
            <div className="text-sm text-bt-fg-muted mt-1">측정값(MSR)</div>
          </div>
        </div>
      </div>

      {calcFields.length > 0 && (
        <div className="rounded border border-bt-border p-5">
          <div className="text-sm font-semibold mb-3">계산 필드 ({calcFields.length}개)</div>
          <div className="flex flex-col gap-2">
            {calcFields.map((cf) => (
              <div key={cf.calcFieldId} className="flex items-center gap-2 text-sm">
                <span className="font-bold text-bt-primary">ƒ</span>
                <span className="font-medium">{cf.displayName}</span>
                <span className="font-mono text-bt-fg-muted">= {cf.rowExpression}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded border border-bt-border bg-bt-bg-muted/30 p-4 text-sm text-bt-fg-muted">
        다음 단계에서 패널을 추가하고 필드를 시각화할 수 있습니다. 계산 필드와 검색조건 바인딩은 편집 모드에서도 언제든지 수정 가능합니다.
      </div>
    </div>
  );
}
