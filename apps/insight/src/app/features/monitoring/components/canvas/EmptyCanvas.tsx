import { useNavigate } from 'react-router-dom';

interface EmptyCanvasProps {
  dashboardId: number;
}

export default function EmptyCanvas({ dashboardId }: EmptyCanvasProps) {
  const navigate = useNavigate();

  const handleTemplate = () => navigate(`/insight/monitoring/dashboards/${dashboardId}/edit/widget/create/template`);
  const handleCustom = () => navigate(`/insight/monitoring/dashboards/${dashboardId}/edit/widget/create/custom`);

  return (
    <div className="flex-1 grid-pattern overflow-auto">
      <div className="flex flex-col items-center justify-center min-h-[460px] py-12 px-8">
        {/* 위젯 일러스트 — 4-cell 그리드 아이콘 */}
        <svg viewBox="0 0 48 48" className="mb-3 h-12 w-12 fill-none stroke-current text-[var(--color-bt-fg-muted)]" strokeWidth="1.5">
          <rect x="6" y="6" width="16" height="16" rx="2" />
          <rect x="26" y="6" width="16" height="10" rx="2" />
          <rect x="26" y="20" width="16" height="16" rx="2" />
          <rect x="6" y="26" width="16" height="10" rx="2" />
        </svg>

        {/* 타이틀 + 설명 */}
        <div className="mb-1 text-[14px] font-semibold text-[var(--color-bt-fg)]">위젯을 추가해보세요</div>
        <p className="mb-5 max-w-md text-center text-[11.5px] text-[var(--color-bt-fg-muted)] leading-relaxed">
          위젯은 2종입니다 — 데이터셋을 직접 매핑하는 <strong>템플릿 위젯</strong> 또는 미리 제공된 <strong>커스텀 위젯</strong>.
        </p>

        {/* 진입점 2종 카드 */}
        <div className="grid grid-cols-2 gap-3 w-full max-w-2xl">
          {/* 템플릿 위젯 — 강조 */}
          <button
            type="button"
            onClick={handleTemplate}
            className="group rounded border-2 border-[var(--color-bt-primary)] bg-white p-4 text-left transition-colors hover:bg-[var(--color-bt-primary-soft)]/30"
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded bg-[var(--color-bt-primary-soft)]">
                <svg viewBox="0 0 16 16" className="h-4 w-4 fill-current text-[var(--color-bt-primary)]">
                  <rect x="2" y="3" width="12" height="3" />
                  <rect x="2" y="8" width="12" height="2" />
                  <rect x="2" y="11" width="8" height="2" />
                </svg>
              </span>
              <span className="text-[13px] font-semibold text-[var(--color-bt-primary)]">+ 템플릿 위젯</span>
            </div>
            <p className="text-[10.5px] text-[var(--color-bt-fg-muted)] leading-snug">
              데이터셋을 선택해서 <strong>그리드 / BAR / LINE / CARD</strong> 중 골라 만듭니다. 패널 아이콘으로 시각화 전환 가능.
            </p>
            <div className="mt-2 inline-flex items-center gap-1 text-[10px] text-[var(--color-bt-primary)]">→ 데이터셋 마법사로 진입</div>
          </button>

          {/* 커스텀 위젯 — 보조 */}
          <button
            type="button"
            onClick={handleCustom}
            className="group rounded border border-[var(--color-bt-border)] bg-white p-4 text-left transition-colors hover:border-[var(--color-bt-primary)] hover:bg-[var(--color-bt-bg-muted)]/30"
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded bg-[var(--color-bt-bg-muted)]">
                <svg viewBox="0 0 16 16" className="h-4 w-4 fill-current text-[var(--color-bt-fg)]">
                  <rect x="2" y="2" width="5" height="5" />
                  <rect x="9" y="2" width="5" height="5" />
                  <rect x="2" y="9" width="5" height="5" />
                  <rect x="9" y="9" width="5" height="5" />
                </svg>
              </span>
              <span className="text-[13px] font-semibold">+ 커스텀 위젯</span>
            </div>
            <p className="text-[10.5px] text-[var(--color-bt-fg-muted)] leading-snug">
              <strong>상태 격자 · 게이지 · 콜 플로우</strong> 등 미리 만들어진 위젯에서 골라 추가. 데이터셋 매핑 불필요.
            </p>
            <div className="mt-2 inline-flex items-center gap-1 text-[10px] text-[var(--color-bt-fg-muted)]">→ 카탈로그에서 선택</div>
          </button>
        </div>
      </div>
    </div>
  );
}
