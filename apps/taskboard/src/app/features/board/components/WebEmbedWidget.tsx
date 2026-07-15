import { useEffect, useState } from 'react';
import type { DroppedWidget } from '../types/taskboard.types';

/** 위젯이 웹 임베드(iframe) 위젯인지 판별 — category='WebEmbed' */
export function isWebEmbedWidget(widget: DroppedWidget): boolean {
  return widget.item.category === 'WebEmbed';
}

/** 라이브 화면에서 iframe을 주기적으로 새로 띄우는 간격(30분) — 라이브 방송 스트림의 미디어 버퍼가
 *  시간이 지날수록 무한히 쌓여 메모리가 계속 증가하는 것을 끊기 위함(리로드 시 잠깐 재로딩됨). */
const IFRAME_RELOAD_INTERVAL_MS = 30 * 60 * 1000;

/** youtube.com/watch·youtu.be·shorts·live 형태에서 영상 ID를 추출한다. embed 전용 URL이 아니면 null. */
function extractYoutubeId(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, '');
  if (host === 'youtu.be') return url.pathname.slice(1).split('/')[0] || null;
  if (host !== 'youtube.com' && host !== 'm.youtube.com') return null;
  if (url.pathname === '/watch') return url.searchParams.get('v');
  const pathMatch = /^\/(shorts|live)\/([\w-]+)/.exec(url.pathname);
  return pathMatch ? pathMatch[2] : null;
}

/**
 * 사용자가 입력한 URL을 iframe src로 쓸 수 있게 정규화한다.
 * - 스킴이 없으면 http:// 를 붙인다(localhost/사내망 입력 편의 — https 강제 없음, 사용자 확정 2026-07-10).
 *   단, 운영 화면이 https로 서빙되면 http iframe은 브라우저 mixed content 정책으로 차단된다(코드로 우회 불가).
 * - YouTube 시청용 URL(watch/youtu.be/shorts/live)은 embed URL로 변환하고 autoplay=1&mute=1을 붙인다 —
 *   전광판 특성상 소리는 항상 차단(음소거 자동재생만 허용, 사용자 확정). 그 외 사이트는 소리를 코드로
 *   끌 수 없지만, 브라우저 자동재생 정책상 사용자 제스처 없이는 소리가 나지 않는다.
 * - 그 외 URL은 그대로 통과 — 대상 사이트가 X-Frame-Options/CSP frame-ancestors로 임베드를 거부하면
 *   iframe 영역이 빈 화면/거부 메시지로 보인다(우리 쪽에서 감지·우회 불가).
 */
export function normalizeEmbedUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
  try {
    const url = new URL(withScheme);
    const youtubeId = extractYoutubeId(url);
    if (youtubeId) {
      return `https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&playsinline=1&loop=1&playlist=${youtubeId}`;
    }
    if (url.hostname.replace(/^www\./, '') === 'youtube.com' && url.pathname.startsWith('/embed/')) {
      // 이미 embed URL이면 음소거 자동재생 파라미터만 보강
      if (!url.searchParams.has('autoplay')) url.searchParams.set('autoplay', '1');
      if (!url.searchParams.has('mute')) url.searchParams.set('mute', '1');
      return url.toString();
    }
    return url.toString();
  } catch {
    return withScheme;
  }
}

/**
 * 웹 임베드 위젯 렌더러 — 등록한 URL의 웹 페이지(홈쇼핑 방송, 사내 대시보드 등)를 위젯 영역 안에
 * iframe으로 표시한다.
 *
 * 보안: sandbox에서 allow-top-navigation/allow-popups를 의도적으로 뺐다 — 임베드된 페이지가 전광판
 * 전체를 다른 주소로 바꿔치기하거나 팝업을 띄우는 것을 브라우저 수준에서 차단한다. allow-scripts와
 * allow-same-origin은 영상 플레이어(YouTube 등) 동작에 필요해서 허용한다.
 *
 * editable(task-create 캔버스)이면 iframe의 마우스 이벤트를 죽여서(pointer-events: none) 위젯
 * 드래그/선택이 iframe에 먹히지 않게 한다 — 편집 중에는 임베드 페이지와 상호작용할 필요가 없다.
 */
export function WebEmbedWidget({ widget, editable = false }: { widget: DroppedWidget; editable?: boolean }) {
  const src = normalizeEmbedUrl(widget.item.webEmbedUrl ?? '');
  const showTitle = widget.showTitle !== false;
  const displayTitle = widget.customTitle ?? widget.item.label;

  // 편집 캔버스(editable)에서는 리로드하지 않는다 — 라이브 화면(task-view/rolling)에서만 30분마다 iframe을
  // 새 key로 remount해 라이브 스트림 미디어 버퍼 누적으로 인한 메모리 증가를 끊는다.
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    if (editable) return;
    const timer = setInterval(() => setReloadKey((k) => k + 1), IFRAME_RELOAD_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [editable]);

  if (!src) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <p className="text-[10px] opacity-60 text-center px-2">URL을 입력하세요 (우측 패널 &gt; 웹 임베드 설정)</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden">
      {showTitle && (
        <div
          className="truncate opacity-80 leading-tight flex-shrink-0 px-1 py-0.5"
          style={{ fontSize: '0.65em', textAlign: widget.style.titleAlign ?? 'left', fontFamily: widget.style.fontFamily, fontWeight: widget.style.fontWeight ?? 'normal' }}
        >
          {displayTitle}
        </div>
      )}
      <iframe
        key={reloadKey}
        src={src}
        title={displayTitle}
        className="w-full flex-1 min-h-0 border-0 bg-black"
        sandbox="allow-scripts allow-same-origin allow-presentation allow-forms"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        referrerPolicy="no-referrer"
        style={editable ? { pointerEvents: 'none' } : undefined}
      />
    </div>
  );
}
