import { useEffect, useState } from 'react';
import { useGetNoticeList, useGetNoticeListByKey } from '../hooks/useTaskboardQueries';
import type { DroppedWidget, TaskboardNotice } from '../types/taskboard.types';

/** 위젯이 공지사항(Announcement) 위젯인지 판별 — category='notice' 또는 id='etc-announcement' */
export function isAnnouncementWidget(widget: DroppedWidget): boolean {
  return widget.item.category === 'notice' || widget.item.id === 'etc-announcement';
}

/** 슬라이드 공지 전환 주기(ms) 기본값 — widget.slideIntervalSec 미지정 시 사용. UX 리듬, 데이터 신선도와는 무관 */
const SLIDE_INTERVAL_MS = 5000;

/**
 * 공지 데이터 재조회 주기(ms) — 공지는 관리자가 가끔 수정하는 데이터라 큐/그룹 KPI처럼 5초마다
 * 받아올 필요는 없음. 1분 주기 폴링으로 "전광판 켜놓은 동안 수정해도 새로고침 없이 반영"은
 * 충족하면서 BFF/DB에 불필요한 호출을 쌓지 않게 함. WS 푸시(서버가 변경 시점에 알려주는 방식)는
 * 변경 빈도 대비 구축 비용이 안 맞아 채택하지 않음 — 빈도가 올라가면 재검토.
 */
const NOTICE_REFETCH_INTERVAL_MS = 60_000;

/**
 * 공지의 "표시 기간"(alwaysActiveYn/startDt/endDt) 기준으로 지금 시점에 보여줄지 판단한다.
 * alwaysActiveYn='Y'면 기간 무시하고 항상 표시. 아니면 startDt~endDt(둘 다 날짜만, 종료일은 그날
 * 23:59:59까지 포함) 범위 안에 있을 때만 표시 — 한쪽이 비어있으면 그쪽은 제한 없음으로 취급.
 */
function isWithinDisplayWindow(notice: TaskboardNotice, now: Date): boolean {
  if (notice.alwaysActiveYn === 'Y') return true;
  if (notice.startDt) {
    const start = new Date(notice.startDt);
    if (!Number.isNaN(start.getTime()) && now < start) return false;
  }
  if (notice.endDt) {
    const end = new Date(notice.endDt);
    if (!Number.isNaN(end.getTime())) {
      end.setHours(23, 59, 59, 999);
      if (now > end) return false;
    }
  }
  return true;
}

/**
 * 공지사항 위젯 렌더러.
 * - widget.item.noticeId: 특정 공지 1건 고정 표시
 * - widget.noticeKey: 공지 키 기준 서버 필터 조회 (useGetNoticeListByKey)
 * - 둘 다 없으면 전체 활성 공지 표시
 *
 * 전광판 실행 중에도 공지 수정/등록이 {@link NOTICE_REFETCH_INTERVAL_MS} 주기로 재조회되어 반영된다.
 * 위젯 1개는 항상 공지 1건만 보여준다 — displayType('fixed'/'slide')은 "고정으로 계속 보일지 vs 여러 건과
 * 순환할지"가 아니라, 그 공지가 화면에 떠 있는 동안 어떻게 표시되는지(정적 텍스트 vs 마퀴로 흘러가는 텍스트)만
 * 결정한다. 매칭된 공지가 여러 건이면 {@link SLIDE_INTERVAL_MS} 주기로 전체(고정/슬라이드 구분 없이)를
 * 한 건씩 순환한다.
 */
export function AnnouncementWidget({ widget }: { widget: DroppedWidget }) {
  const { data: notices } = useGetNoticeList({ queryOptions: { refetchInterval: NOTICE_REFETCH_INTERVAL_MS } });
  const { data: keyNotices } = useGetNoticeListByKey(widget.noticeKey ?? '', { queryOptions: { refetchInterval: NOTICE_REFETCH_INTERVAL_MS } });

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), NOTICE_REFETCH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  // activeYn(노출 여부) — useYn은 소프트삭제 플래그라 삭제 안 된 행은 항상 'Y'라서 "사용/미사용" 판정에 못 쓴다.
  const active = (notices ?? []).filter((n) => n.activeYn === 'Y' && isWithinDisplayWindow(n, now));
  const filtered = widget.item.noticeId
    ? active.filter((n) => n.noticeId === widget.item.noticeId)
    : widget.noticeKey
      ? (keyNotices ?? []).filter((n) => n.activeYn === 'Y' && isWithinDisplayWindow(n, now))
      : active;
  const sorted = [...filtered].sort((a, b) => a.sortOrder - b.sortOrder);

  // 슬라이드 속도(초) — task-create 속성 패널에서 위젯별로 지정. 회전 전환 주기와 마퀴 흐름 속도에 공통 사용.
  const slideIntervalSec = widget.slideIntervalSec ?? SLIDE_INTERVAL_MS / 1000;
  const slideIntervalMs = slideIntervalSec * 1000;

  const [slideIndex, setSlideIndex] = useState(0);
  useEffect(() => {
    if (sorted.length <= 1) {
      setSlideIndex(0);
      return;
    }
    const timer = setInterval(() => setSlideIndex((i) => (i + 1) % sorted.length), slideIntervalMs);
    return () => clearInterval(timer);
  }, [sorted.length, slideIntervalMs]);

  const current = sorted.length > 0 ? sorted[slideIndex % sorted.length] : null;
  const visible = current ? [current] : [];
  const showTitle = widget.showTitle !== false;

  if (visible.length === 0) {
    return (
      <div className="opacity-50 italic leading-tight truncate" style={{ fontSize: '0.8em', textAlign: widget.style.valueAlign ?? 'left', fontFamily: widget.style.fontFamily }}>
        {widget.noticeKey ? '공지사항 없음' : '공지 키를 선택하세요'}
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-y-auto flex flex-col gap-1.5">
      {visible.map((notice) => (
        <div key={notice.noticeId} className="leading-tight min-w-0 flex-shrink-0">
          {showTitle && notice.title && (
            <div
              className="truncate mb-0.5 opacity-80"
              style={{ fontSize: '0.65em', textAlign: widget.style.titleAlign ?? 'left', fontFamily: widget.style.fontFamily, fontWeight: widget.style.fontWeight ?? 'normal' }}
            >
              {notice.title}
            </div>
          )}
          {notice.displayType === 'slide' ? (
            <div className="overflow-hidden whitespace-nowrap" style={{ fontFamily: widget.style.fontFamily, fontWeight: widget.style.fontWeight ?? 'normal' }}>
              <span className="tb-marquee-track" style={{ animationDuration: `${slideIntervalSec}s` }}>
                {notice.content}
              </span>
            </div>
          ) : (
            <div
              className="truncate"
              style={{ textAlign: widget.style.valueAlign ?? 'left', fontFamily: widget.style.fontFamily, fontWeight: widget.style.fontWeight ?? 'normal' }}
            >
              {notice.content}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
