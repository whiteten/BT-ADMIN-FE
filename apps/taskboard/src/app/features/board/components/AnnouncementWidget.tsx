import { useGetNoticeList, useGetNoticeListByKey } from '../hooks/useTaskboardQueries';
import type { DroppedWidget } from '../types/taskboard.types';

/** 위젯이 공지사항(Announcement) 위젯인지 판별 — category='notice' 또는 id='etc-announcement' */
export function isAnnouncementWidget(widget: DroppedWidget): boolean {
  return widget.item.category === 'notice' || widget.item.id === 'etc-announcement';
}

/**
 * 공지사항 위젯 렌더러.
 * - widget.item.noticeId: 특정 공지 1건 고정 표시
 * - widget.noticeKey: 공지 키 기준 서버 필터 조회 (useGetNoticeListByKey)
 * - 둘 다 없으면 전체 활성 공지 표시
 */
export function AnnouncementWidget({ widget }: { widget: DroppedWidget }) {
  const { data: notices } = useGetNoticeList();
  const { data: keyNotices } = useGetNoticeListByKey(widget.noticeKey ?? '');

  const active = (notices ?? []).filter((n) => n.useYn === 'Y');
  const filtered = widget.item.noticeId ? active.filter((n) => n.noticeId === widget.item.noticeId) : widget.noticeKey ? (keyNotices ?? []) : active;
  const sorted = [...filtered].sort((a, b) => a.sortOrder - b.sortOrder);
  const showTitle = widget.showTitle !== false;

  if (sorted.length === 0) {
    return (
      <div className="opacity-50 italic leading-tight truncate" style={{ fontSize: '0.8em', textAlign: widget.style.valueAlign ?? 'left', fontFamily: widget.style.fontFamily }}>
        {widget.noticeKey ? '공지사항 없음' : '공지 키를 선택하세요'}
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-y-auto flex flex-col gap-1.5">
      {sorted.map((notice) => (
        <div key={notice.noticeId} className="leading-tight min-w-0 flex-shrink-0">
          {showTitle && notice.title && (
            <div
              className="truncate mb-0.5 opacity-80"
              style={{ fontSize: '0.65em', textAlign: widget.style.titleAlign ?? 'left', fontFamily: widget.style.fontFamily, fontWeight: widget.style.fontWeight ?? 'normal' }}
            >
              {notice.title}
            </div>
          )}
          <div className="truncate" style={{ textAlign: widget.style.valueAlign ?? 'left', fontFamily: widget.style.fontFamily, fontWeight: widget.style.fontWeight ?? 'normal' }}>
            {notice.content}
          </div>
        </div>
      ))}
    </div>
  );
}
