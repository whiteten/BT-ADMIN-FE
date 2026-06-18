/**
 * 2층 노드 카드 (번호자원 현황) — 클러스터 슬라이더 안의 노드 1개 카드.
 *
 * 표준 2단 재설계의 2층. 카드 전체가 단일 클릭 타깃 → 우측 드릴다운 사이드바(개요 탭).
 * 자원행 개별 클릭 없음(어포던스 단순화 — 설계 2). 카드 폭 충분히(텍스트 잘림 0).
 *
 * 표시: 노드명 · 등록 DN(내선+SIP트렁크 채널+그룹DN 예약 — 배너·상세와 동일 정의) · 내선 할당/총(진행바) · SIP트렁크 채널 할당/총(진행바)
 *  · GDN 3종(ACD/CTI큐/SIP트렁크) 건수(진행바 없음 — 할당 데이터 없음, DOMAIN §GDN 할당률)
 *  · GlobalDN 노드 합계 · DR 칩(파트너 노드 + 건수).
 * 노드 상태점 없음(헬스 데이터 없음 — 사용자 결정).
 *
 * 선택 보더/hover 토큰은 DnTenantCard(AdnTenantCard) 표준 계승: 선택 #405189 + ring, hover #c5cbe0.
 */
import { Globe, Server } from 'lucide-react';
import type { DnNodeCardModel } from '../types';

interface DnNodeCardProps {
  model: DnNodeCardModel;
  selected: boolean;
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}

/** 타입 할당 진행바 (내선/SIP트렁크 채널) — 라벨 · 할당/총 · 바 */
function AllocRow({ label, total, assigned, color }: { label: string; total: number; assigned: number; color: string }) {
  const pct = total > 0 ? Math.round((assigned / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="w-[92px] flex-shrink-0 text-gray-600">{label}</span>
      <span className="flex h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
        <span className="block h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </span>
      <span className="w-[68px] flex-shrink-0 text-right text-gray-700">
        <b className="text-gray-800">{assigned.toLocaleString()}</b> / {total.toLocaleString()}
      </span>
    </div>
  );
}

export default function DnNodeCard({ model, selected, onClick }: DnNodeCardProps) {
  const { nodeName, totalDn, edn, tdn, gdnAcd, gdnCtiq, gdnSip, globalDnTotal, drPartners } = model;

  return (
    <div
      className={`flex w-[300px] flex-shrink-0 cursor-pointer flex-col rounded-lg border bg-white p-3 transition-all ${
        selected ? 'border-[#405189] shadow-[0_0_0_2px_rgba(64,81,137,0.15)]' : 'border-gray-200 hover:border-[#c5cbe0] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
      }`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') (e.currentTarget as HTMLElement).click();
      }}
    >
      {/* 헤더: 노드명 + 등록 DN (배너·상세 도넛과 동일 정의 — 내선+SIP트렁크 채널+그룹DN 예약) */}
      <div className="mb-2 flex items-center gap-1.5 border-b border-gray-100 pb-2">
        <Server className={`size-3.5 flex-shrink-0 ${selected ? 'text-[#405189]' : 'text-gray-500'}`} />
        <span className={`truncate text-[13px] font-semibold ${selected ? 'text-[#405189]' : 'text-gray-800'}`} title={nodeName}>
          {nodeName}
        </span>
        <span className="ml-auto flex-shrink-0 text-[11px] text-gray-500" title="등록 DN (내선 + SIP트렁크 채널 + 그룹DN 예약). 배너·상세 도넛과 동일 정의입니다.">
          등록 DN <b className="text-gray-700">{totalDn.toLocaleString()}</b>
        </span>
      </div>

      {/* 타입 할당 진행바 */}
      <div className="flex flex-col gap-1.5">
        <AllocRow label="내선" total={edn.total} assigned={edn.assigned} color="#405189" />
        <AllocRow label="SIP트렁크 채널" total={tdn.total} assigned={tdn.assigned} color="#d97706" />
      </div>

      {/* GDN 3종 건수 (할당 데이터 없음 — 건수만) */}
      <div className="mt-2 flex items-center gap-2 border-t border-gray-100 pt-2 text-[11px]">
        <span className="flex-shrink-0 text-gray-500">그룹DN</span>
        <span className="flex flex-1 items-center justify-end gap-2.5 text-gray-600">
          <span title="ACD">
            ACD <b className="text-gray-800">{gdnAcd.toLocaleString()}</b>
          </span>
          <span className="text-gray-200">|</span>
          <span title="CTI큐">
            CTI큐 <b className="text-gray-800">{gdnCtiq.toLocaleString()}</b>
          </span>
          <span className="text-gray-200">|</span>
          <span title="SIP트렁크">
            SIP트렁크 <b className="text-gray-800">{gdnSip.toLocaleString()}</b>
          </span>
        </span>
      </div>

      {/* GlobalDN 노드 합계 + DR 칩 */}
      <div className="mt-2 flex items-center gap-2 pt-0.5 text-[11px]">
        <span className="flex items-center gap-1 text-violet-600">
          <Globe className="size-3" />
          GlobalDN <b>{globalDnTotal.toLocaleString()}</b>
        </span>
        {drPartners.length > 0 && (
          <span className="ml-auto flex flex-wrap items-center justify-end gap-1">
            {drPartners.map((p) => (
              <span
                key={p.nodeId}
                className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700"
                title={`이 노드가 ${p.nodeName} 의 DN ${p.count}건을 재해복구(DR) 백업으로 수용`}
              >
                DR 수용 ← {p.nodeName} <b>{p.count.toLocaleString()}</b>
              </span>
            ))}
          </span>
        )}
      </div>
    </div>
  );
}
