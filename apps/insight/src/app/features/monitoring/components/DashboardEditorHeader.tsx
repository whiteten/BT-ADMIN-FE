import { useState } from 'react';
import { Button } from 'antd';
import { Bookmark, Eye, Save } from 'lucide-react';
import { toast } from '@/shared-util';
import { DOMAIN_COLOR_CLASS } from '../constants/monitoringConstants';
import type { DashboardDetail } from '../types';

interface DashboardEditorHeaderProps {
  dashboard: DashboardDetail;
  onPreview?: () => void;
  onSave?: () => void;
  onRename?: (newName: string) => void;
}

export default function DashboardEditorHeader({ dashboard, onPreview, onSave, onRename }: DashboardEditorHeaderProps) {
  const [name, setName] = useState(dashboard.dashboardName);

  const handleNameBlur = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setName(dashboard.dashboardName);
      return;
    }
    if (trimmed !== dashboard.dashboardName) {
      onRename?.(trimmed);
    }
  };

  return (
    <div className="flex items-center justify-between bg-white border-b border-[var(--color-bt-border)] px-7 py-3">
      {/* 좌측: 이름 inline edit + 뱃지들 */}
      <div className="flex items-center gap-2 min-w-0">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleNameBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            if (e.key === 'Escape') {
              setName(dashboard.dashboardName);
              e.currentTarget.blur();
            }
          }}
          className="border-b border-transparent bg-transparent text-[15px] font-semibold hover:border-[var(--color-bt-border)] focus:border-[var(--color-bt-primary)] focus:outline-none px-1 py-0.5 min-w-[200px] max-w-[400px]"
        />
        <span className={`shrink-0 rounded px-1.5 py-0.5 mono text-[9.5px] font-bold ${DOMAIN_COLOR_CLASS[dashboard.domainCode]}`}>{dashboard.domainCode}</span>

        {dashboard.menuRegistered ? (
          <span className="shrink-0 rounded bg-[var(--color-bt-success-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-bt-success)]">메뉴 등록</span>
        ) : (
          <span className="shrink-0 rounded bg-[var(--color-bt-warn-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-bt-warn)]">초안</span>
        )}
      </div>

      {/* 우측: 액션 버튼들 */}
      <div className="flex items-center gap-2">
        <Button icon={<Eye className="w-3.5 h-3.5" />} onClick={onPreview}>
          미리보기
        </Button>
        <Button icon={<Save className="w-3.5 h-3.5" />} onClick={onSave}>
          저장
        </Button>
        <Button type="primary" icon={<Bookmark className="w-3.5 h-3.5" />} onClick={() => toast.info('메뉴 등록 화면은 다음 버전에서 제공됩니다.')} title="M14 — v0.1 제외 (D137)">
          메뉴 등록
        </Button>
      </div>
    </div>
  );
}
