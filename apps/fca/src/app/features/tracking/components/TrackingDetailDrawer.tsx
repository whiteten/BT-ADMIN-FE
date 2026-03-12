import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Descriptions, Drawer, Spin } from 'antd';
import TrackingDialogView from './TrackingDialogView';
import { useSendTrackingCommand } from '../hooks/useTrackingQueries';
import type { TrackingCommandRequest, TrackingSessionDetail } from '../types/tracking.types';

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

  // Ref for beforeunload handler to access latest state without stale closures
  const trackingRef = useRef<{ isTracking: boolean; params: DrawerParams | null }>({
    isTracking: false,
    params: null,
  });

  useEffect(() => {
    trackingRef.current = { isTracking, params: drawerState.params };
  }, [isTracking, drawerState.params]);

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
  // 드로어가 열렸는데 아직 SSE 상세 데이터가 없으면 로딩 표시
  const isLoading = drawerState.open && isTracking && !sseDetail;

  const drawerTitle = params?.ucid ? `세션 상세 - ${params.ucid.length > 20 ? params.ucid.slice(0, 20) + '...' : params.ucid}` : '세션 상세';

  return (
    <Drawer open={drawerState.open} onClose={handleClose} title={drawerTitle} closable={{ placement: 'end' }} width={640} destroyOnHidden>
      <Spin spinning={isLoading}>
        <div className="flex flex-col gap-4">
          {/* 세션 정보 */}
          {session && (
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="시나리오명" span={2}>
                {session.serviceName}
              </Descriptions.Item>
              <Descriptions.Item label="발신번호">{session.ani}</Descriptions.Item>
              <Descriptions.Item label="착신번호">{session.dnis}</Descriptions.Item>
              <Descriptions.Item label="시스템ID">{session.systemId}</Descriptions.Item>
              <Descriptions.Item label="채널번호">{session.sleeChno}</Descriptions.Item>
            </Descriptions>
          )}

          {/* 대화 흐름 (채팅 버블 UI) */}
          <div className="overflow-y-auto max-h-[480px] pr-1">
            <TrackingDialogView items={trackingFlow} />
          </div>
        </div>
      </Spin>
    </Drawer>
  );
});

TrackingDetailDrawer.displayName = 'TrackingDetailDrawer';

export default TrackingDetailDrawer;
