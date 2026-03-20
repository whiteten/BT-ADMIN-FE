import { Bot, User } from 'lucide-react';
import { getResultColor, getTrackingItemConfig } from '../config/trackingItemConfig';
import type { TrackingFlowItem } from '../types/tracking.types';

interface TrackingDialogViewProps {
  items: TrackingFlowItem[];
}

function EmptyState() {
  return <p className="py-6 text-center text-sm text-slate-400">트래킹 데이터가 없습니다. 트래킹을 시작해주세요.</p>;
}

function MenuEntryDivider({ item }: { item: TrackingFlowItem }) {
  const label = item.menuName ?? item.menuId;
  return (
    <div className="flex items-center gap-2 py-1">
      <div className="flex-1 h-px bg-slate-200" />
      <span className="text-xs font-medium text-slate-500 px-2 py-0.5 bg-slate-100 rounded-full border border-slate-200">
        {label}
        {item.startTime && <span className="ml-1.5 text-slate-400 font-normal">{item.startTime}</span>}
      </span>
      <div className="flex-1 h-px bg-slate-200" />
    </div>
  );
}

function SystemBubble({ item }: { item: TrackingFlowItem }) {
  const cfg = getTrackingItemConfig(item.type);
  const Icon = cfg.icon;
  const resultColor = getResultColor(item.result);
  const text = item.description ?? item.typeName;

  return (
    <div className="flex justify-center">
      <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200 rounded-full max-w-xs">
        <Icon size={11} className={cfg.color} />
        <span className="text-xs text-slate-500 truncate">{text}</span>
        {item.result && <span className={`text-xs font-medium shrink-0 ${resultColor}`}>{item.result}</span>}
      </div>
    </div>
  );
}

function BotBubble({ item }: { item: TrackingFlowItem }) {
  const cfg = getTrackingItemConfig(item.type);
  const Icon = cfg.icon;
  const resultColor = getResultColor(item.result);
  const text = item.description ?? item.typeName;

  return (
    <div className="flex items-end gap-2 max-w-[80%] ml-auto flex-row-reverse">
      {/* 아바타 */}
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
        <Bot size={15} className="text-blue-600" />
      </div>

      {/* 말풍선 */}
      <div className="flex flex-col items-end gap-0.5">
        <div className="flex items-center gap-1.5 mb-0.5">
          {item.startTime && <span className="text-[10px] text-slate-300">{item.startTime}</span>}
          <span className="text-[10px] text-slate-400">{item.typeName}</span>
          <Icon size={11} className={cfg.color} />
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg rounded-br-sm px-3 py-2 shadow-sm">
          <p className="text-sm text-slate-700 leading-relaxed break-words">{text}</p>
        </div>
        {item.result && <span className={`text-[10px] font-medium ${resultColor}`}>{item.result}</span>}
      </div>
    </div>
  );
}

function CustomerBubble({ item }: { item: TrackingFlowItem }) {
  const cfg = getTrackingItemConfig(item.type);
  const Icon = cfg.icon;
  const resultColor = getResultColor(item.result);
  const isFailed = item.result?.startsWith('F') === true;
  const text = item.description ?? (isFailed ? '인식 실패' : item.typeName);

  return (
    <div className={`flex items-end gap-2 max-w-[80%] ${isFailed ? 'opacity-60' : ''}`}>
      {/* 아바타 */}
      <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${isFailed ? 'bg-slate-100' : 'bg-green-100'}`}>
        <User size={15} className={isFailed ? 'text-slate-400' : 'text-green-600'} />
      </div>

      {/* 말풍선 */}
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5 mb-0.5">
          <Icon size={11} className={cfg.color} />
          <span className="text-[10px] text-slate-400">{item.typeName}</span>
          {item.startTime && <span className="text-[10px] text-slate-300">{item.startTime}</span>}
        </div>
        <div className={`border rounded-lg rounded-bl-sm px-3 py-2 shadow-sm ${isFailed ? 'bg-slate-50 border-slate-200' : 'bg-green-50 border-green-200'}`}>
          <p className={`text-sm leading-relaxed break-words ${isFailed ? 'text-slate-400 italic' : 'text-slate-700'}`}>{text}</p>
        </div>
        {item.result && <span className={`text-[10px] font-medium ${resultColor}`}>{item.result}</span>}
      </div>
    </div>
  );
}

/** TRACKING_DATA 기반 대화 채팅 버블 UI */
export default function TrackingDialogView({ items }: TrackingDialogViewProps) {
  if (items.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="flex flex-col gap-3 px-1">
      {items.map((item, idx) => {
        const role = item.dialogRole;

        // 숨김 처리 (멀티모달 type 2/3 포함)
        if (role === 'HIDDEN' || item.type === 2 || item.type === 3) return null;

        // 메뉴 진입 → 구분선 (menuId 또는 menuName이 있을 때만)
        if (item.type === 0 && (item.menuId || item.menuName)) {
          return <MenuEntryDivider key={idx} item={item} />;
        }

        // 시스템 이벤트 → 중앙 작은 배지
        if (role === 'SYSTEM') {
          return <SystemBubble key={idx} item={item} />;
        }

        // 봇 발화 → 좌측 말풍선
        if (role === 'BOT') {
          return <BotBubble key={idx} item={item} />;
        }

        // 고객 입력 → 우측 말풍선
        if (role === 'CUSTOMER') {
          return <CustomerBubble key={idx} item={item} />;
        }

        return null;
      })}
    </div>
  );
}
