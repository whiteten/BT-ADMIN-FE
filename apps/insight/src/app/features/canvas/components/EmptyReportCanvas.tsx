import { Layout, Plus } from 'lucide-react';

interface EmptyReportCanvasProps {
  /** 구성 시작 클릭 → 영역분할 모달 오픈 */
  onStart: () => void;
  title?: string;
}

/**
 * 보고서 초기 구성 화면. (모니터링 EmptyCanvas 와 동일 톤앤매너)
 * "구성 시작하기" 클릭 시 영역분할 모달이 열린다.
 */
export default function EmptyReportCanvas({ onStart, title = '보고서 구성하기' }: EmptyReportCanvasProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[480px] py-16 px-8 animate-in fade-in duration-700">
      <div className="w-full max-w-md text-center">
        <button
          type="button"
          onClick={onStart}
          className="group relative flex w-full flex-col items-center justify-center gap-8 rounded-2xl border border-[#dee2e6] bg-white p-16 shadow-sm transition-all hover:border-[var(--color-bt-primary)] hover:shadow-xl hover:-translate-y-1 active:translate-y-0 active:shadow-md"
        >
          <div className="relative">
            <div className="absolute inset-0 rounded-[2rem] bg-[var(--color-bt-primary)] opacity-0 blur-xl transition-opacity group-hover:opacity-20" />
            <div className="relative flex h-24 w-24 items-center justify-center rounded-[2rem] bg-[#f8f9fa] text-[#adb5bd] border border-[#f1f3f5] transition-all group-hover:bg-[#085fb5] group-hover:text-white group-hover:shadow-lg group-hover:scale-110 group-hover:rotate-2">
              <Layout className="h-12 w-12" strokeWidth={1.5} />
            </div>
          </div>

          <div className="flex flex-col items-center gap-3">
            <h2 className="text-[22px] font-bold text-[#495057] tracking-tight">{title}</h2>
            <div className="flex items-center gap-2 rounded-full bg-[#085fb5] px-6 py-2.5 text-[13.5px] font-bold text-white shadow-md transition-colors group-hover:bg-[#0756a3]">
              <Plus className="h-4 w-4" strokeWidth={3} />
              구성 시작하기
            </div>
          </div>

          <div className="absolute inset-0 -z-10 bg-[radial-gradient(#e9ecef_1.5px,transparent_1.5px)] [background-size:20px_24px] opacity-40" />
        </button>

        <p className="mt-8 text-[12.5px] text-[#868e96] leading-relaxed">
          보고서의 기본 레이아웃을 설정하고 <br />
          원하는 위치에 패널을 자유롭게 배치해보세요.
        </p>
      </div>
    </div>
  );
}
