import { useNavigate } from 'react-router-dom';
import { ArrowRight, Boxes, LayoutTemplate } from 'lucide-react';

interface EmptyCanvasProps {
  dashboardId: number;
}

export default function EmptyCanvas({ dashboardId }: EmptyCanvasProps) {
  const navigate = useNavigate();

  const handleTemplate = () => navigate(`/insight/monitoring/dashboards/${dashboardId}/edit/widget/create/template`);
  const handleCustom = () => navigate(`/insight/monitoring/dashboards/${dashboardId}/edit/widget/create/custom`);

  return (
    <div className="flex-1 grid-pattern overflow-auto">
      <div className="flex flex-col items-center justify-center min-h-[460px] py-16 px-8">
        {/* 일러스트 */}
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-bt-primary-soft)]">
          <svg viewBox="0 0 32 32" className="h-7 w-7 fill-none stroke-current text-[var(--color-bt-primary)]" strokeWidth="1.5">
            <rect x="4" y="4" width="11" height="11" rx="1.5" />
            <rect x="17" y="4" width="11" height="6.5" rx="1.5" />
            <rect x="17" y="13" width="11" height="15" rx="1.5" />
            <rect x="4" y="17" width="11" height="11" rx="1.5" />
          </svg>
        </div>

        {/* 타이틀 + 설명 */}
        <h2 className="text-[15px] font-semibold text-[var(--color-bt-fg)]">위젯을 추가해보세요</h2>
        <p className="mt-1.5 mb-6 max-w-md text-center text-[12px] text-[var(--color-bt-fg-muted)] leading-relaxed">
          데이터셋을 매핑하는 <strong className="text-[var(--color-bt-fg)]">템플릿 위젯</strong>과<br />
          미리 만들어진 <strong className="text-[var(--color-bt-fg)]">커스텀 위젯</strong> 중에서 선택하세요.
        </p>

        {/* 위젯 타입 카드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
          {/* 템플릿 위젯 — primary */}
          <button
            type="button"
            onClick={handleTemplate}
            className="group flex flex-col rounded-lg border border-[var(--color-bt-primary)] bg-white p-5 text-left shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
          >
            <div className="mb-3 flex items-center gap-2.5">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-bt-primary)] text-white">
                <LayoutTemplate className="h-[18px] w-[18px]" />
              </span>
              <span className="text-[13.5px] font-semibold text-[var(--color-bt-primary)]">템플릿 위젯</span>
            </div>
            <p className="text-[11.5px] text-[var(--color-bt-fg-muted)] leading-relaxed mb-3">
              데이터셋을 골라 <strong className="text-[var(--color-bt-fg)]">그리드 · 막대 · 선 · 카드</strong> 중에서 시각화를 선택합니다.
            </p>
            <span className="mt-auto inline-flex items-center gap-1 text-[11px] font-medium text-[var(--color-bt-primary)] group-hover:gap-1.5 transition-all">
              데이터셋 마법사 시작 <ArrowRight className="h-3 w-3" />
            </span>
          </button>

          {/* 커스텀 위젯 — secondary */}
          <button
            type="button"
            onClick={handleCustom}
            className="group flex flex-col rounded-lg border border-[var(--color-bt-border)] bg-white p-5 text-left shadow-sm transition-all hover:border-[var(--color-bt-fg-muted)] hover:shadow-md hover:-translate-y-0.5"
          >
            <div className="mb-3 flex items-center gap-2.5">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-bt-bg-muted)] text-[var(--color-bt-fg)]">
                <Boxes className="h-[18px] w-[18px]" />
              </span>
              <span className="text-[13.5px] font-semibold text-[var(--color-bt-fg)]">커스텀 위젯</span>
            </div>
            <p className="text-[11.5px] text-[var(--color-bt-fg-muted)] leading-relaxed mb-3">
              <strong className="text-[var(--color-bt-fg)]">상태 격자 · 게이지 · 콜 플로우</strong> 등 미리 만든 위젯을 그대로 배치합니다.
            </p>
            <span className="mt-auto inline-flex items-center gap-1 text-[11px] font-medium text-[var(--color-bt-fg-muted)] group-hover:gap-1.5 group-hover:text-[var(--color-bt-fg)] transition-all">
              카탈로그 열기 <ArrowRight className="h-3 w-3" />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
