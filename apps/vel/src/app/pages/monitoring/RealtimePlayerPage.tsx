import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getCookie } from '@/shared-util';

/**
 * 실시간 감청 플레이어 팝업 (데모).
 *
 * Veloce가 API로 제공하는 실시간 스트리밍 엔드포인트(V5 `/proxy/RealTimePlay.do`와 동일 계약)를
 * SWAT FE가 어떻게 소비하는지 보여주기 위한 예시 페이지. 별도 BE 없이 FE만으로 동작 — 단,
 * 음원은 Veloce가 제공하는 API(api_base)가 audio/mpeg 청크를 흘려줘야 재생된다.
 *
 * 동작: `POST {apiBase}/RealTimePlay.do` (JSON body)로 지속 연결 → 흘러오는 MP3 청크를
 * MediaSource('audio/mpeg')에 append하며 라이브 엣지로 점프. 종료 시 StopRealTimePlay.do.
 * (V5 frontend/src/components/RealTimePlay.tsx 이식 — 스트리밍 로직 동일, 셸만 우리 스타일)
 *
 * 끝까지 가져갈 페이지가 아니라 PoC 데모용.
 */

// 무음 자동종료(초). 데모/테스트 편의상 길게. 패킷 수신 시마다 리셋됨.
const SILENCE_TIMEOUT = 1800;

type Status = 'IDLE' | 'LOADING' | 'READY' | 'PLAYING' | 'ERROR';

export default function RealtimePlayerPage() {
  const [searchParams] = useSearchParams();
  const sessionId = useRef(`sid_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`);
  const audioTag = useRef<HTMLAudioElement | null>(null);
  const mediaSource = useRef<MediaSource | null>(null);
  const sourceBuffer = useRef<SourceBuffer | null>(null);
  const queue = useRef<Uint8Array[]>([]);
  const isPumping = useRef(false);
  const abortController = useRef<AbortController | null>(null);
  const lastPacketTime = useRef(Date.now());
  const statusRef = useRef<Status>('LOADING');

  const [status, setStatus] = useState<Status>('LOADING');
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [timeLeft, setTimeLeft] = useState(SILENCE_TIMEOUT);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [message, setMessage] = useState('실시간 감청을 시작합니다...');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // 수신 방식: 'poll' = 세그먼트 폴링(원래, /vel-realtime-play, BFF aggregation 통과·운영 동작)
  //            'stream' = 무한 스트림(테스트, /vel-realtime-stream, BFF 패스스루 검증용)
  const mode: 'poll' | 'stream' = searchParams.get('mode') === 'stream' ? 'stream' : 'poll';

  const params = {
    tenant_id: searchParams.get('tenant_id') || '2000000001',
    agent_dn: searchParams.get('agent_dn') || '4408',
    manager_id: searchParams.get('manager_id') || 'btadmin',
    agent_id: searchParams.get('agent_id') || 'null',
    agent_name: searchParams.get('agent_name') || 'null',
    ip: searchParams.get('ip') || '',
    port: searchParams.get('port') || '',
    media_ip: searchParams.get('media_ip') || '',
    media_port: searchParams.get('media_port') || '',
  };

  useEffect(() => {
    document.title = `실시간 감청 — ${params.agent_name !== 'null' ? params.agent_name : params.agent_dn}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // sid는 스트리밍 effect가 run마다 새로 발급하므로(StrictMode 이중 실행 대비), 명시 sid가 없으면
  // 현재 살아있는 sid(sessionId.current)를 사용한다.
  const sendStopSignal = (sid: string = sessionId.current) => {
    // BFF aggregation flow(vel-realtime-stop) 경유 → VEL realtimeStop(agent_dn+sid 쿼리). POST라 CSRF 필요.
    const stopUrl = `/api/bff/vel-realtime-stop?agent_dn=${encodeURIComponent(params.agent_dn)}&sid=${encodeURIComponent(sid)}`;
    // best-effort: 실패해도 서버가 브라우저 연결 끊김을 감지해 세션 정리.
    fetch(stopUrl, { method: 'POST', keepalive: true, headers: { 'X-CSRF-TOKEN': getCookie('XSRF-TOKEN') ?? '' } }).catch(() => undefined);
  };

  // 무음 자동종료 타이머
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    if (isMonitoring && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0 && isMonitoring) {
      setIsMonitoring(false);
      setStatus('IDLE');
      setMessage(`${SILENCE_TIMEOUT >= 60 ? Math.floor(SILENCE_TIMEOUT / 60) + '분' : SILENCE_TIMEOUT + '초'} 무음 제한으로 종료되었습니다.`);
      sendStopSignal();
      abortController.current?.abort();
    }
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMonitoring, timeLeft]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleToggleMonitoring = () => {
    if (isMonitoring) {
      setIsMonitoring(false);
      setStatus('IDLE');
      setMessage('모니터링이 중단되었습니다.');
    } else {
      if (timeLeft <= 0) setTimeLeft(SILENCE_TIMEOUT);
      setIsMonitoring(true);
      setRefreshKey((prev) => prev + 1);
    }
  };

  const pump = () => {
    if (!sourceBuffer.current || isPumping.current || sourceBuffer.current.updating) return;
    const buf = queue.current.shift();
    if (!buf) return;
    isPumping.current = true;
    try {
      sourceBuffer.current.appendBuffer(buf);
    } catch (e) {
      isPumping.current = false;
      queue.current.unshift(buf);
      if (e instanceof Error && e.name === 'QuotaExceededError' && audioTag.current && sourceBuffer.current) {
        const removeUntil = Math.max(0, audioTag.current.currentTime - 10);
        if (removeUntil > 0) sourceBuffer.current.remove(0, removeUntil);
      }
    }
  };

  // 스트리밍 연결: Veloce API에 지속 연결하고 흘러오는 MP3 청크를 MSE로 재생
  useEffect(() => {
    if (!isMonitoring) return;

    // run마다 새 sid 발급. StrictMode(dev)나 재마운트로 effect가 다시 돌 때, 이전 run의 cleanup이
    // 보내는 StopRealTimePlay가 이번 run의 Core 세션(다른 sid=다른 key)을 죽이지 않도록 키를 분리한다.
    // (V5는 StrictMode 미적용이라 이 문제가 없었음 — 우리 dev 하니스만의 차이)
    const sid = `sid_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    sessionId.current = sid; // 외부 핸들러(무음 타이머·beforeunload)가 현재 살아있는 sid를 참조

    const audio = new Audio();
    audioTag.current = audio;
    audio.volume = isMuted ? 0 : volume / 100;

    const ms = new MediaSource();
    mediaSource.current = ms;
    const msUrl = URL.createObjectURL(ms);
    audio.src = msUrl;

    const localAbort = new AbortController();
    abortController.current = localAbort;

    // 2초간 패킷 없으면 대기 상태 표시
    const watchdog = setInterval(() => {
      if (statusRef.current === 'PLAYING' && Date.now() - lastPacketTime.current > 2000) {
        setStatus('READY');
        setMessage('실시간 감청 대기 중 (패킷 대기)...');
      }
    }, 500);

    const handleSourceOpen = () => {
      if (ms.sourceBuffers.length > 0) return;
      const sb = ms.addSourceBuffer('audio/mpeg');
      sb.mode = 'sequence';
      sourceBuffer.current = sb;

      sb.addEventListener('updateend', () => {
        isPumping.current = false;
        pump();
        if (!sb.updating && audio.buffered.length > 0) {
          const start = audio.buffered.start(0);
          const end = audio.currentTime - 60;
          if (end > start) {
            try {
              sb.remove(start, end);
            } catch {
              /* ignore */
            }
          }
        }
      });

      // 같은 sid로 /vel-realtime-play 를 반복 POST(폴링). VEL이 sid별 세션을 유지하며 Core 오디오를
      // 버퍼링했다가 ~1초짜리 "유한 조각"으로 잘라서 응답한다. 각 조각은 EOF로 끝나므로 BFF aggregation을
      // 통과한다(무한 스트림은 BFF가 flush 못 함 → 청취처럼 유한 응답으로 우회). 조각을 MSE에 이어붙여 재생.
      const requestBody = {
        cmd: 'RecPlayRealTime',
        tenant_id: params.tenant_id,
        agent_dn: params.agent_dn,
        manager_id: params.manager_id,
        ip: params.ip,
        port: params.port,
        media_ip: params.media_ip,
        media_port: params.media_port,
        sid,
      };

      const pollLoop = async () => {
        setStatus('READY');
        setMessage('실시간 감청 대기 중 (연결 유지)...');
        lastPacketTime.current = Date.now();
        while (!localAbort.signal.aborted) {
          try {
            const response = await fetch(`/api/bff/vel-realtime-play`, {
              method: 'POST',
              signal: localAbort.signal,
              headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': getCookie('XSRF-TOKEN') ?? '' },
              body: JSON.stringify(requestBody),
            });
            if (!response.ok) throw new Error('segment request failed');

            const seg = new Uint8Array(await response.arrayBuffer());
            if (seg.length > 10) {
              // 실제 음성 조각 수신
              lastPacketTime.current = Date.now();
              setTimeLeft(SILENCE_TIMEOUT);
              if (statusRef.current !== 'PLAYING') {
                setStatus('PLAYING');
                setMessage('실시간 감청 중...');
              }
              queue.current.push(seg);
              pump();

              // 라이브 엣지로 점프(실시간성 유지)
              if (audio.buffered.length > 0) {
                const lastBuffered = audio.buffered.end(audio.buffered.length - 1);
                if (lastBuffered - audio.currentTime > 2.5) audio.currentTime = lastBuffered - 0.3;
              }
              if (audio.paused) audio.play().catch(() => undefined);
            } else if (statusRef.current === 'PLAYING') {
              // 빈 조각 지속 = 통화 무음/대기
              setStatus('READY');
              setMessage('실시간 감청 대기 중 (패킷 대기)...');
            }
          } catch {
            if (localAbort.signal.aborted) break;
            setStatus('READY');
            setMessage('연결 복구 중...');
            await new Promise((r) => setTimeout(r, 1000));
          }
        }
      };

      // [테스트] 무한 스트림: /vel-realtime-stream 에 한 번 연결하고 흘러오는 MP3 청크를 reader로 받아
      // 그대로 MSE에 append. BFF가 무한 audio/mpeg를 flush(패스스루)하면 동작, 못하면 0바이트로 막힘.
      const streamLoop = async () => {
        setStatus('READY');
        setMessage('실시간 스트림 연결 중 (BFF 패스스루 테스트)...');
        lastPacketTime.current = Date.now();
        try {
          const response = await fetch(`/api/bff/vel-realtime-stream`, {
            method: 'POST',
            signal: localAbort.signal,
            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': getCookie('XSRF-TOKEN') ?? '' },
            body: JSON.stringify(requestBody),
          });
          if (!response.ok || !response.body) throw new Error('stream request failed');

          const reader = response.body.getReader();
          while (!localAbort.signal.aborted) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value && value.length > 1) {
              lastPacketTime.current = Date.now();
              setTimeLeft(SILENCE_TIMEOUT);
              if (statusRef.current !== 'PLAYING') {
                setStatus('PLAYING');
                setMessage('실시간 감청 중 (스트림)...');
              }
              queue.current.push(value);
              pump();

              if (audio.buffered.length > 0) {
                const lastBuffered = audio.buffered.end(audio.buffered.length - 1);
                if (lastBuffered - audio.currentTime > 2.5) audio.currentTime = lastBuffered - 0.3;
              }
              if (audio.paused) audio.play().catch(() => undefined);
            }
          }
        } catch {
          if (!localAbort.signal.aborted) {
            setStatus('ERROR');
            setMessage('스트림 연결 실패 — BFF 패스스루 미지원일 수 있음 (폴링 모드 사용 권장).');
          }
        }
      };

      if (mode === 'stream') streamLoop();
      else pollLoop();
    };

    // beforeunload 핸들러는 이벤트 인자가 sid로 새지 않도록 이 run의 sid로 바인딩
    const handleBeforeUnload = () => sendStopSignal(sid);

    ms.addEventListener('sourceopen', handleSourceOpen);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      sendStopSignal(sid); // 이 run이 만든 세션만 정리 (다른 run의 세션은 건드리지 않음)
      localAbort.abort();
      clearInterval(watchdog);
      audio.pause();
      audio.src = '';
      URL.revokeObjectURL(msUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey, isMonitoring]);

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    if (audioTag.current) audioTag.current.volume = next ? 0 : volume / 100;
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setVolume(val);
    if (audioTag.current) audioTag.current.volume = val / 100;
    setIsMuted(val === 0);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-start justify-center p-4 pt-6">
      <div className="bg-white rounded shadow-md w-full max-w-lg overflow-hidden">
        {/* 헤더 */}
        <div className="bg-red-700 text-white px-4 py-2.5 text-sm font-semibold flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full bg-white ${isMonitoring ? 'animate-pulse' : 'opacity-40'}`} />
          실시간 감청 {mode === 'stream' ? '(스트림 테스트)' : '(폴링)'}
          <span className="ml-auto flex items-center gap-1 text-xs font-normal opacity-90">
            자동종료
            <span className={`font-mono ${timeLeft < 60 ? 'text-yellow-300' : ''}`}>{formatTime(timeLeft)}</span>
          </span>
        </div>

        {/* 상태 표시 */}
        <div className="mx-4 mt-3 h-28 bg-gray-900 rounded flex items-center justify-center">
          {status === 'PLAYING' ? (
            <div className="flex items-end gap-1 h-12">
              {Array.from({ length: 15 }).map((_, i) => (
                <span
                  key={i}
                  className="w-1.5 bg-gradient-to-t from-indigo-500 to-purple-500 rounded-sm"
                  style={{ animation: 'vel-eq 1s infinite ease-in-out', animationDelay: `${i * 0.05}s`, height: '100%' }}
                />
              ))}
              <style>{`@keyframes vel-eq{0%,100%{height:15%}50%{height:100%}}`}</style>
            </div>
          ) : (
            <span className="text-xs text-gray-400">{message}</span>
          )}
        </div>

        {/* 정보 */}
        <div className="border border-gray-200 rounded mx-4 mt-3 divide-y divide-gray-200 text-sm">
          <div className="grid grid-cols-[100px_1fr]">
            <div className="bg-gray-50 px-3 py-1.5 font-medium text-gray-600 border-r border-gray-200">내선번호</div>
            <div className="px-3 py-1.5">{params.agent_dn}</div>
          </div>
          <div className="grid grid-cols-[100px_1fr]">
            <div className="bg-gray-50 px-3 py-1.5 font-medium text-gray-600 border-r border-gray-200">상담원</div>
            <div className="px-3 py-1.5">{params.agent_name !== 'null' ? params.agent_name : '-'}</div>
          </div>
          <div className="grid grid-cols-[100px_1fr]">
            <div className="bg-gray-50 px-3 py-1.5 font-medium text-gray-600 border-r border-gray-200">미디어</div>
            <div className="px-3 py-1.5 text-gray-400 text-xs">
              {params.media_ip}:{params.media_port}
            </div>
          </div>
        </div>

        {/* 컨트롤 */}
        <div className="mx-4 my-3 flex items-center gap-3">
          <button
            onClick={handleToggleMonitoring}
            className={`flex-1 h-10 rounded text-sm font-medium text-white transition-colors ${
              isMonitoring ? 'bg-gray-500 hover:bg-gray-600' : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {isMonitoring ? '모니터링 중지' : '모니터링 시작'}
          </button>
          <div className="flex items-center gap-2 px-3 h-10 bg-gray-100 rounded">
            <button onClick={toggleMute} className="text-gray-500 hover:text-gray-700 text-xs w-8">
              {isMuted || volume === 0 ? '🔇' : '🔊'}
            </button>
            <input type="range" min={0} max={100} value={volume} onChange={handleVolumeChange} className="w-24 accent-indigo-600" />
          </div>
        </div>

        {/* 종료 */}
        <div className="px-4 pb-4 flex justify-between items-center">
          <span className="text-xs text-gray-400">{status === 'IDLE' ? '준비됨' : message}</span>
          <button onClick={() => window.close()} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors">
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
