import { useState } from 'react';
import { Columns, Layout, LayoutGrid, Maximize, Plus, Rows } from 'lucide-react';

interface EmptyCanvasProps {
  /** 레이아웃 선택 완료 시 호출 (row 분할 수, col 분할 수) */
  onLayoutSelect: (rows: number, cols: number) => void;
  title?: string;
  description?: string;
}

type Phase = 'intro' | 'picking';

/**
 * 대시보드 초기 구성 화면.
 * FCA 디자인 톤앤매너를 반영하여 전문가용 도구의 느낌을 주도록 구성.
 */
export default function EmptyCanvas({ onLayoutSelect, title = '대시보드 구성하기' }: EmptyCanvasProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[480px] py-16 px-8 animate-in fade-in duration-700">
      <div className="w-full max-w-md text-center">
        <button
          type="button"
          onClick={() => onLayoutSelect(0, 0)}
          className="group relative flex w-full flex-col items-center justify-center gap-8 rounded-2xl border border-[#dee2e6] bg-white p-16 shadow-sm transition-all hover:border-[var(--color-bt-primary)] hover:shadow-xl hover:-translate-y-1 active:translate-y-0 active:shadow-md"
        >
          {/* 대시보드 아이콘 섹션 — Hover 시 하이라이트 효과 */}
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

          {/* 배경 장식 (FCA 스타일의 미니멀한 격자나 점) */}
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(#e9ecef_1.5px,transparent_1.5px)] [background-size:20px_24px] opacity-40" />
        </button>

        <p className="mt-8 text-[12.5px] text-[#868e96] leading-relaxed">
          대시보드의 기본 레이아웃을 설정하고 <br />
          원하는 위치에 위젯을 자유롭게 배치해보세요.
        </p>
      </div>
    </div>
  );
}
