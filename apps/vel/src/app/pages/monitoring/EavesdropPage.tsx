import { useEffect, useRef, useState } from 'react';
import { withBasePath } from '@/shared-util';
import type { EavesdropInfo } from '../../features/monitoring/types/monitoring';

const TH = 'bg-gray-50 px-3 py-1.5 font-medium text-gray-600 flex items-center border-r border-gray-200 text-sm whitespace-nowrap';
const TD = 'px-3 py-1.5 flex items-center text-sm min-w-0';

function loadEavesdropInfo(): EavesdropInfo | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const key = params.get('eavesdropId');
    if (!key) return null;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as EavesdropInfo;
  } catch {
    return null;
  }
}

// MFU 실시간 스트림 URL 구성
// 실제 MFU 서버의 스트리밍 URL 형식을 확인 후 수정 필요
function buildStreamUrl(mfuIp: string, dnNo: string): string {
  return `http://${mfuIp}:8080/BT-VELOCE/recording/RealTimeStream.do?dnNo=${dnNo}`;
}

export default function EavesdropPage() {
  const [info] = useState<EavesdropInfo | null>(() => loadEavesdropInfo());
  const [startTime] = useState(() => new Date().toLocaleString('ko-KR'));
  const [audioError, setAudioError] = useState(false);
  const [volume, setVolume] = useState(1.0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const infoRef = useRef<EavesdropInfo | null>(null);
  infoRef.current = info;

  useEffect(() => {
    if (info) document.title = `실시간 감청 — ${info.userName ?? info.userId ?? info.dnNo}`;
  }, [info]);

  // 팝업 초기화: RT 사용자 등록 + 로그 INSERT
  useEffect(() => {
    if (!info) return;

    fetch(withBasePath('/api/bff/vel-monitoring-rt-user'), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId: info.tenantId,
        rtUserName: info.workerName,
        dnNo: info.dnNo,
      }),
    }).catch(() => undefined);

    fetch(withBasePath('/api/bff/vel-monitoring-rt-log'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId: info.tenantId,
        workerId: info.workerId,
        userId: info.userId ?? '',
        dnNo: info.dnNo ?? '',
        userIp: '',
      }),
    }).catch(() => undefined);
  }, [info]);

  // 팝업 닫힐 때 RT 사용자 초기화 (keepalive fetch)
  useEffect(() => {
    const handleBeforeUnload = () => {
      const cur = infoRef.current;
      if (!cur) return;
      fetch(withBasePath('/api/bff/vel-monitoring-rt-user-clear'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: cur.tenantId, dnNo: cur.dnNo }),
        keepalive: true,
      });
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const handleVolumeChange = (v: number) => {
    if (audioRef.current) audioRef.current.volume = v;
    setVolume(v);
  };

  const handleClose = () => {
    window.close();
  };

  if (!info) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-sm text-gray-400">감청 정보가 없습니다.</p>
      </div>
    );
  }

  const streamUrl = info.mfuIp && info.dnNo ? buildStreamUrl(info.mfuIp, info.dnNo) : null;

  return (
    <div className="min-h-screen bg-gray-100 flex items-start justify-center p-4 pt-6">
      <div className="bg-white rounded shadow-md w-full max-w-lg overflow-hidden">
        {/* 헤더 */}
        <div className="bg-red-700 text-white px-4 py-2.5 text-sm font-semibold flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zm5.3 11A5.3 5.3 0 0 1 6.7 12H5a7 7 0 0 0 6 6.93V21H9v2h6v-2h-2v-2.07A7 7 0 0 0 19 12z" />
          </svg>
          실시간 감청
          <span className="ml-auto text-xs font-normal opacity-80">감청중</span>
        </div>

        {/* 상담원 정보 */}
        <div className="border border-gray-200 rounded mx-4 mt-3 divide-y divide-gray-200">
          <div className="grid grid-cols-[100px_1fr]">
            <div className={TH}>상담원ID</div>
            <div className={TD}>{info.userId ?? '-'}</div>
          </div>
          <div className="grid grid-cols-[100px_1fr]">
            <div className={TH}>상담원명</div>
            <div className={TD}>{info.userName ?? '-'}</div>
          </div>
          <div className="grid grid-cols-[100px_1fr]">
            <div className={TH}>내선번호</div>
            <div className={TD}>{info.dnNo ?? '-'}</div>
          </div>
          <div className="grid grid-cols-[100px_1fr_100px_1fr]">
            <div className={TH}>감청자</div>
            <div className={TD}>
              {info.workerName}({info.workerId})
            </div>
            <div className={`${TH} border-l`}>시작시간</div>
            <div className={TD}>{startTime}</div>
          </div>
          {info.mfuIp && (
            <div className="grid grid-cols-[100px_1fr]">
              <div className={TH}>MFU IP</div>
              <div className={`${TD} text-gray-400 text-xs`}>{info.mfuIp}</div>
            </div>
          )}
        </div>

        {/* 오디오 플레이어 */}
        <div className="mx-4 my-3 p-4 bg-gray-50 rounded border border-gray-200">
          {!streamUrl ? (
            <p className="text-center text-sm text-red-500 py-2">MFU IP 또는 내선번호 정보가 없습니다.</p>
          ) : audioError ? (
            <div className="text-center py-2">
              <p className="text-sm text-red-500">오디오 스트림에 연결할 수 없습니다.</p>
              <p className="text-xs text-gray-400 mt-1">MFU 서버 URL을 확인하세요: {streamUrl}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded text-red-600 text-xs font-medium">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  LIVE
                </div>
                <span className="text-xs text-gray-500 truncate">{streamUrl}</span>
              </div>

              {/* HTML5 audio element — 실시간 HTTP 스트림 */}
              <audio ref={audioRef} src={streamUrl} autoPlay controls={false} onError={() => setAudioError(true)} style={{ display: 'none' }} />

              {/* 볼륨 컨트롤 */}
              <div className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-gray-400 flex-shrink-0">
                  {volume === 0 ? (
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                  ) : (
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                  )}
                </svg>
                <span className="text-xs text-gray-500">볼륨</span>
                <input type="range" min={0} max={1} step={0.05} value={volume} onChange={(e) => handleVolumeChange(Number(e.target.value))} className="flex-1 accent-red-600" />
                <span className="text-xs text-gray-400 w-8 text-right">{Math.round(volume * 100)}%</span>
              </div>
            </div>
          )}
        </div>

        {/* 종료 버튼 */}
        <div className="px-4 pb-4 flex justify-end">
          <button onClick={handleClose} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors">
            감청 종료
          </button>
        </div>
      </div>
    </div>
  );
}
