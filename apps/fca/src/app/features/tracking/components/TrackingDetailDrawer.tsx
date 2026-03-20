import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Descriptions, Drawer, Spin, message } from 'antd';
import { ChevronsDown, Copy, Pin } from 'lucide-react';
import TrackingDialogView from './TrackingDialogView';
import { useSendTrackingCommand } from '../hooks/useTrackingQueries';
import type { TrackingCommandRequest, TrackingSessionDetail } from '../types/tracking.types';

/** HTTP/HTTPS 환경 모두에서 동작하는 클립보드 복사 */
function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }
  // HTTP(비보안 컨텍스트) fallback: execCommand 사용
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none;';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  try {
    document.execCommand('copy');
    return Promise.resolve();
  } catch (err) {
    return Promise.reject(err);
  } finally {
    document.body.removeChild(textarea);
  }
}

const TRACKING_COMMAND_URL = '/api/bff/sse/fca/tracking/bot-realtime/command';

export interface TrackingDetailDrawerRef {
  open: (params: { ucid: string; nexthop: number; systemId: number; sleeChno: number; nodeId: number }) => void;
  close: () => void;
}

interface DrawerParams {
  ucid: string;
  nexthop: number;
  systemId: number;
  sleeChno: number;
  nodeId: number;
}

interface DrawerState {
  open: boolean;
  params: DrawerParams | null;
}

interface TrackingDetailDrawerProps {
  /** SSE session-detail 이벤트로 수신된 상세 데이터 */
  sseDetail?: TrackingSessionDetail | null;
  /** 드로어 닫힐 때 상위에서 detail 상태 초기화 */
  onClose?: () => void;
}

const TrackingDetailDrawer = forwardRef<TrackingDetailDrawerRef, TrackingDetailDrawerProps>(({ sseDetail, onClose }, ref) => {
  const [drawerState, setDrawerState] = useState<DrawerState>({ open: false, params: null });
  const [isTracking, setIsTracking] = useState(false);
  /** 자동 스크롤 활성 여부 — 기본값 true (자동 따라내려가기) */
  const [autoScroll, setAutoScroll] = useState(true);

  // Ref for beforeunload handler to access latest state without stale closures
  const trackingRef = useRef<{ isTracking: boolean; params: DrawerParams | null }>({
    isTracking: false,
    params: null,
  });

  // 대화 흐름 스크롤 ref
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    trackingRef.current = { isTracking, params: drawerState.params };
  }, [isTracking, drawerState.params]);

  // 드로어 열릴 때 자동 스크롤 초기화
  useEffect(() => {
    if (drawerState.open) {
      setAutoScroll(true);
    }
  }, [drawerState.open]);

  // SSE 데이터 수신 시 자동 스크롤 (autoScroll이 true인 경우만, 부드러운 애니메이션)
  useEffect(() => {
    if (!autoScroll) return;
    const el = scrollRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [sseDetail, autoScroll]);

  const params = drawerState.params;

  const { mutate: sendCommand } = useSendTrackingCommand();

  const buildCommandRequest = (p: DrawerParams, state: number): TrackingCommandRequest => ({
    systemId: p.systemId,
    nodeId: p.nodeId,
    sleeChno: p.sleeChno,
    state,
    ucid: p.ucid,
    nexthop: p.nexthop,
  });

  // Auto-start tracking when drawer opens
  useEffect(() => {
    if (drawerState.open && params) {
      sendCommand(buildCommandRequest(params, 1));
      setIsTracking(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawerState.open]);

  const handleClose = () => {
    // Auto-stop tracking on drawer close
    const { isTracking: tracking, params: p } = trackingRef.current;
    if (tracking && p) {
      sendCommand(buildCommandRequest(p, 2));
    }
    setIsTracking(false);
    setDrawerState((prev) => ({ ...prev, open: false }));
    onClose?.();
  };

  useImperativeHandle(ref, () => ({
    open: (openParams) => {
      setDrawerState({ open: true, params: openParams });
    },
    close: () => {
      handleClose();
    },
  }));

  // Send stop command when browser tab closes or browser exits
  useEffect(() => {
    const handleBeforeUnload = () => {
      const { isTracking: tracking, params: p } = trackingRef.current;
      if (tracking && p) {
        const payload = JSON.stringify(buildCommandRequest(p, 2));
        navigator.sendBeacon(TRACKING_COMMAND_URL, new Blob([payload], { type: 'application/json' }));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const session = sseDetail?.session;
  const trackingFlow = sseDetail?.trackingFlow ?? [];
  const isLoading = drawerState.open && isTracking && !sseDetail;

  const drawerTitle = '세션 상세';

  const handleCopyUcid = (ucid: string) => {
    copyToClipboard(ucid)
      .then(() => message.success('UCID가 복사되었습니다.'))
      .catch(() => message.error('복사에 실패했습니다.'));
  };

  /** 드로어 헤더 우측 스크롤 제어 버튼 */
  const drawerExtra = (
    <div className="flex items-center gap-1">
      <button
        type="button"
        title="자동 스크롤 (새 대화가 오면 자동으로 아래로 이동)"
        onClick={() => setAutoScroll(true)}
        className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
          autoScroll ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
        }`}
      >
        <ChevronsDown size={13} />
        <span>자동</span>
      </button>
      <button
        type="button"
        title="스크롤 고정 (현재 위치에서 멈춤)"
        onClick={() => setAutoScroll(false)}
        className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
          !autoScroll ? 'bg-amber-100 text-amber-600' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
        }`}
      >
        <Pin size={13} />
        <span>고정</span>
      </button>
    </div>
  );

  return (
    <Drawer
      open={drawerState.open}
      onClose={handleClose}
      title={drawerTitle}
      extra={drawerExtra}
      closable={{ placement: 'end' }}
      width={640}
      destroyOnHidden
      styles={{ body: { padding: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden' } }}
    >
      <div className="flex flex-col flex-1 min-h-0 gap-4">
        {/* 인라인 로딩 */}
        {isLoading && (
          <div className="flex justify-center py-6">
            <Spin />
          </div>
        )}

        {/* 세션 정보 */}
        {session && (
          <div className="flex-shrink-0">
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="시나리오명" span={2}>
                {session.serviceName}
              </Descriptions.Item>
              <Descriptions.Item label="UCID" span={2}>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs">{session.ucid}</span>
                  <button
                    type="button"
                    title="UCID 복사"
                    onClick={() => handleCopyUcid(session.ucid)}
                    className="flex items-center text-slate-400 hover:text-blue-500 transition-colors"
                  >
                    <Copy size={13} />
                  </button>
                </div>
              </Descriptions.Item>
              <Descriptions.Item label="발신번호">{session.ani}</Descriptions.Item>
              <Descriptions.Item label="착신번호">{session.dnis}</Descriptions.Item>
            </Descriptions>
          </div>
        )}

        {/* 대화 흐름 — 남은 공간 전체 차지 */}
        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto pr-1">
          <TrackingDialogView items={trackingFlow} />
        </div>
      </div>
    </Drawer>
  );
});

TrackingDetailDrawer.displayName = 'TrackingDetailDrawer';

export default TrackingDetailDrawer;
