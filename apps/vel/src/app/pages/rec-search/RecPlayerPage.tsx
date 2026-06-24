import { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin, { type Region } from 'wavesurfer.js/dist/plugins/regions.esm.js';
import { recSearchApi } from '../../features/rec-search/api/recSearchApi';
import type { RecFileListItem } from '../../features/rec-search/types';

/**
 * 녹취 재생 팝업 (새창).
 *
 * 통화내역조회([RecSearchList])에서 `window.open('/vel/rec-search/player?playerId=...')`로
 * 띄우는 chromeless 새창 페이지. 재생목록(RecFileListItem[])과 시작 인덱스는 localStorage로 전달한다
 * (실시간 감청 [EavesdropPage]와 동일한 새창+localStorage 패턴).
 *
 * 2026-05-20 embedded modal(RecPlayerModal)로 전환했다가, 다중 녹취를 별도 창에서
 * 동시에 듣고 화면을 점유하지 않으려는 요구로 다시 새창 방식으로 환원.
 */

type ChannelMode = 'MIX' | 'TX' | 'RX';

interface PlayerPayload {
  playlist: RecFileListItem[];
  startIndex: number;
}

const SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0, 4.0];

// 배속은 창을 닫았다 다시 열어도 유지되도록 localStorage에 보존한다.
const SPEED_STORAGE_KEY = 'vel-rec-player-speed';

function loadSavedSpeed(): number {
  const raw = Number(localStorage.getItem(SPEED_STORAGE_KEY));
  return SPEEDS.includes(raw) ? raw : 1.0;
}

// 구간 반복(A-B) 영역 색상
const LOOP_REGION_COLOR = 'rgba(237, 143, 20, 0.18)';

// 파형 채널 색상. TX(상담원)=좌채널 초록, RX(고객)=우채널 파랑. 선택 안 한 채널은 회색으로 죽인다.
const CH_TX = { waveColor: '#6ee7b7', progressColor: '#059669' };
const CH_RX = { waveColor: '#93c5fd', progressColor: '#2563eb' };
const CH_MUTED = { waveColor: '#e5e7eb', progressColor: '#9ca3af' };

/** 선택 채널에 따른 splitChannels 색상 (MIX=둘 다 컬러, TX=RX 회색, RX=TX 회색). */
function splitChannelsFor(mode: ChannelMode) {
  return [
    mode === 'RX' ? CH_MUTED : CH_TX, // ch0 = TX(좌)
    mode === 'TX' ? CH_MUTED : CH_RX, // ch1 = RX(우)
  ];
}

const TH = 'bg-gray-50 px-3 py-1 font-medium text-gray-600 flex items-center border-r border-gray-200 text-sm whitespace-nowrap';
const TD = 'px-3 py-1 flex items-center text-sm min-w-0';

function formatTime(sec: number) {
  if (!isFinite(sec) || sec < 0) return '00:00';
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, '0');
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, '0');
  return `${m}:${s}`;
}

function formatRecTime(t?: string) {
  if (!t || t.length < 14) return t ?? '';
  return `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)} ${t.slice(8, 10)}:${t.slice(10, 12)}:${t.slice(12, 14)}`;
}

function formatCallTime(sec?: number | string) {
  const n = Number(sec);
  if (!n) return '';
  const h = Math.floor(n / 3600)
    .toString()
    .padStart(2, '0');
  const m = Math.floor((n % 3600) / 60)
    .toString()
    .padStart(2, '0');
  const s = (n % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function speedLabel(s: number) {
  return Number.isInteger(s) ? `${s}.0x` : `${s}x`;
}

function loadPayload(): PlayerPayload | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const key = params.get('playerId');
    if (!key) return null;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    // 새창에서 1회 소비 후 제거 — localStorage 누적 방지
    localStorage.removeItem(key);
    const parsed = JSON.parse(raw) as PlayerPayload;
    if (!Array.isArray(parsed.playlist) || parsed.playlist.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

export default function RecPlayerPage() {
  const [payload] = useState<PlayerPayload | null>(() => loadPayload());
  const playlist = payload?.playlist ?? [];
  const [currentIndex, setCurrentIndex] = useState(payload?.startIndex ?? 0);

  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [channel, setChannel] = useState<ChannelMode>('MIX');
  const [speed, setSpeed] = useState(() => loadSavedSpeed());
  const [volume, setVolume] = useState(1.0);
  const [statusMsg, setStatusMsg] = useState('');
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [regionRange, setRegionRange] = useState<{ start: number; end: number } | null>(null);

  const waveformRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const regionsRef = useRef<RegionsPlugin | null>(null);
  const loopRegionRef = useRef<Region | null>(null);
  const disableDragRef = useRef<(() => void) | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainTXRef = useRef<GainNode | null>(null);
  const gainRXRef = useRef<GainNode | null>(null);
  const playlistRef = useRef<RecFileListItem[]>(playlist);
  const channelRef = useRef<ChannelMode>('MIX');
  const speedRef = useRef(speed);
  const loopEnabledRef = useRef(loopEnabled);
  // 파일청취 로그를 트랙당 1회만 남기기 위한 dedup(StrictMode 이중 마운트/재방문 중복 방지)
  const loggedKeysRef = useRef<Set<string>>(new Set());
  playlistRef.current = playlist;
  channelRef.current = channel;
  speedRef.current = speed;
  loopEnabledRef.current = loopEnabled;

  const rec = playlist[currentIndex] ?? null;
  const recKey = rec?.recKey;

  useEffect(() => {
    document.title = playlist.length > 1 ? `녹취 재생 (${playlist.length}건)` : '녹취 재생';
  }, [playlist.length]);

  // 팝업 창을 컨텐츠(카드) 크기에 맞춤. 단건/재생목록/에러 등으로 높이가 바뀌면 ResizeObserver가 자동 재조정.
  // (window.resizeTo는 script로 연 팝업에서만 동작 — 이 페이지가 그 케이스)
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const fit = () => {
      const rect = el.getBoundingClientRect();
      const margin = 24; // 카드 주변 여백
      const chromeW = Math.max(0, window.outerWidth - window.innerWidth);
      const chromeH = Math.max(0, window.outerHeight - window.innerHeight);
      window.resizeTo(Math.ceil(rect.width + margin * 2) + chromeW, Math.ceil(rect.height + margin * 2) + chromeH);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 트랙 전환 시 WaveSurfer 재구성
  //
  // MFU(7214)는 "스트리밍" cmd(RecPlayRealTime)에도 완전한 MP3 한 덩어리를 반환하므로
  // MSE(MediaSource) 청크 누적이 불필요하다. WaveSurfer에 BFF 스트림 URL을 직접 물려
  // WaveSurfer가 자체 fetch+디코딩+재생하게 한다(표준 패턴). 채널 분리(TX/RX)는 audio
  // 엘리먼트를 Web Audio로 라우팅해서 처리.
  useEffect(() => {
    if (!recKey || !waveformRef.current) return;

    setLoading(true);
    setError(false);
    setPlaying(false);
    setCurrent(0);
    setDuration(0);
    setStatusMsg('음원 불러오는 중...');

    const container = waveformRef.current;
    const audio = new Audio();
    audio.crossOrigin = 'anonymous';

    let disposed = false;

    const setupAudioNodes = () => {
      if (audioCtxRef.current) return;
      try {
        const ctx = new AudioContext();
        const source = ctx.createMediaElementSource(audio);
        const splitter = ctx.createChannelSplitter(2);
        const gainTX = ctx.createGain();
        const gainRX = ctx.createGain();
        const merger = ctx.createChannelMerger(2);

        source.connect(splitter);
        splitter.connect(gainTX, 0, 0);
        splitter.connect(gainRX, 1, 0);
        gainTX.connect(merger, 0, 0);
        gainTX.connect(merger, 0, 1);
        gainRX.connect(merger, 0, 0);
        gainRX.connect(merger, 0, 1);
        merger.connect(ctx.destination);

        const mode = channelRef.current;
        const g = mode === 'MIX' ? 0.7 : 1;
        gainTX.gain.value = mode === 'RX' ? 0 : g;
        gainRX.gain.value = mode === 'TX' ? 0 : g;

        audioCtxRef.current = ctx;
        gainTXRef.current = gainTX;
        gainRXRef.current = gainRX;
      } catch {
        // Web Audio 미지원 — 기본 스테레오 재생으로 폴백
      }
    };

    const ws = WaveSurfer.create({
      container,
      media: audio,
      // 채널 분리(TX/RX)는 아래 Web Audio ChannelSplitter가 클라이언트단에서 처리하므로
      // 서버에는 항상 2채널 stereo를 요청한다(mono로 받으면 TX/RX 분리 불가).
      url: `/api/bff/vel-rec-stream?recKey=${encodeURIComponent(recKey)}&type=stereo`,
      height: 100,
      cursorColor: '#6b7280',
      cursorWidth: 1,
      normalize: false,
      // TX(상담원)=좌채널, RX(고객)=우채널. 현재 선택 채널 기준 색상(미선택 채널은 회색).
      splitChannels: splitChannelsFor(channelRef.current),
    });
    wsRef.current = ws;

    // 구간 반복(A-B): Regions 플러그인. 트랙마다 ws가 재생성되므로 region/drag 상태도 리셋한다.
    const regions = ws.registerPlugin(RegionsPlugin.create());
    regionsRef.current = regions;
    loopRegionRef.current = null;
    disableDragRef.current = null;
    setRegionRange(null);

    const enableDrag = () => {
      disableDragRef.current?.();
      disableDragRef.current = regions.enableDragSelection({ color: LOOP_REGION_COLOR });
    };

    // 새 구간을 그리면 기존 구간은 제거(단일 구간만 유지)
    regions.on('region-created', (region) => {
      regions.getRegions().forEach((r) => {
        if (r.id !== region.id) r.remove();
      });
      loopRegionRef.current = region;
      setRegionRange({ start: region.start, end: region.end });
    });
    // 드래그 리사이즈 중에도 표시 구간을 갱신
    regions.on('region-updated', (region) => {
      if (loopRegionRef.current?.id === region.id) setRegionRange({ start: region.start, end: region.end });
    });
    regions.on('region-removed', (region) => {
      if (loopRegionRef.current?.id === region.id) {
        loopRegionRef.current = null;
        setRegionRange(null);
      }
    });
    // 재생이 구간 끝을 벗어나면 구간 시작으로 되돌려 반복
    regions.on('region-out', (region) => {
      if (loopEnabledRef.current && loopRegionRef.current?.id === region.id) {
        region.play();
      }
    });

    ws.on('ready', () => {
      if (disposed) return;
      const d = ws.getDuration();
      if (isFinite(d) && d > 0) setDuration(d);
      setLoading(false);
      setStatusMsg('');
      setupAudioNodes();
      // 파일청취 로그 INSERT (레거시 동일 — 재생 시점에 청취로그 기록). 트랙당 1회, 실패해도 재생엔 영향 없음.
      if (!loggedKeysRef.current.has(recKey)) {
        loggedKeysRef.current.add(recKey);
        recSearchApi.insertListenLog(recKey).catch(() => {
          /* 청취로그 기록 실패는 무시 — 재생 흐름 방해하지 않음 */
        });
      }
      // 저장된 배속 재적용(트랙 전환 시 1x로 리셋되는 것 방지)
      ws.setPlaybackRate(speedRef.current);
      // 구간 반복이 켜진 상태로 트랙이 바뀌면 새 파형에서도 드래그 지정을 다시 활성화
      if (loopEnabledRef.current) enableDrag();
      ws.play().catch(() => {
        /* autoplay block 무시 — 사용자가 재생 버튼 클릭 */
      });
    });
    ws.on('play', () => {
      audioCtxRef.current?.resume();
      setPlaying(true);
    });
    ws.on('pause', () => setPlaying(false));
    ws.on('timeupdate', (t) => setCurrent(t));
    ws.on('finish', () => {
      setPlaying(false);
      // 다음 트랙 자동 재생
      setCurrentIndex((i) => (i < playlistRef.current.length - 1 ? i + 1 : i));
    });
    ws.on('error', (err) => {
      if (disposed) return;
      console.error('[RecPlayer] wavesurfer error', err);
      setError(true);
      setLoading(false);
      setStatusMsg('');
    });

    return () => {
      disposed = true;
      try {
        ws.destroy(); // 등록된 Regions 플러그인도 함께 정리됨
      } catch {
        // ignore
      }
      wsRef.current = null;
      regionsRef.current = null;
      loopRegionRef.current = null;
      disableDragRef.current = null;
      audioCtxRef.current?.close().catch(() => {
        /* 이미 close된 ctx 무시 */
      });
      audioCtxRef.current = null;
      gainTXRef.current = null;
      gainRXRef.current = null;
    };
  }, [recKey]);

  const applyChannel = (mode: ChannelMode) => {
    const gainTX = gainTXRef.current;
    const gainRX = gainRXRef.current;
    if (gainTX && gainRX) {
      const g = mode === 'MIX' ? 0.7 : 1;
      gainTX.gain.value = mode === 'RX' ? 0 : g;
      gainRX.gain.value = mode === 'TX' ? 0 : g;
    }
    // 파형 색도 함께 갱신 — 미선택 채널은 회색으로 죽인다.
    wsRef.current?.setOptions({ splitChannels: splitChannelsFor(mode) });
    setChannel(mode);
  };

  const handleSpeedChange = (v: number) => {
    wsRef.current?.setPlaybackRate(v);
    setSpeed(v);
    localStorage.setItem(SPEED_STORAGE_KEY, String(v));
  };

  const handleVolumeChange = (v: number) => {
    wsRef.current?.setVolume(v);
    setVolume(v);
  };

  // 정지: 일시정지 후 처음으로 되감기
  const handleStop = () => {
    const ws = wsRef.current;
    if (!ws) return;
    ws.stop();
    setPlaying(false);
    setCurrent(0);
  };

  const handleToggleLoop = () => {
    const next = !loopEnabled;
    setLoopEnabled(next);
    loopEnabledRef.current = next;
    const regions = regionsRef.current;
    if (!regions) return;
    if (next) {
      disableDragRef.current?.();
      disableDragRef.current = regions.enableDragSelection({ color: LOOP_REGION_COLOR });
    } else {
      disableDragRef.current?.();
      disableDragRef.current = null;
      regions.clearRegions();
      loopRegionRef.current = null;
      setRegionRange(null);
    }
  };

  const handleClearRegion = () => {
    regionsRef.current?.clearRegions();
    loopRegionRef.current = null;
    setRegionRange(null);
  };

  const handleRowClick = (index: number) => {
    if (index === currentIndex) {
      wsRef.current?.playPause();
    } else {
      setCurrentIndex(index);
    }
  };

  if (!payload) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-sm text-gray-400">재생할 녹취 정보가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-start justify-center p-4 pt-6">
      <div ref={cardRef} className="bg-white rounded shadow-md w-full max-w-2xl overflow-hidden">
        {/* 헤더 */}
        <div className="bg-gray-700 text-white px-4 py-2.5 text-sm font-semibold flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" />
          </svg>
          녹취 재생
          {playlist.length > 1 && (
            <span className="ml-auto text-xs font-normal opacity-80">
              {currentIndex + 1} / {playlist.length}
            </span>
          )}
        </div>

        {/* 현재 트랙 메타 */}
        {rec && (
          <div className="border border-gray-200 rounded mx-4 mt-3 divide-y divide-gray-200">
            <div className="grid grid-cols-[90px_1fr]">
              <div className={TH}>통화일시</div>
              <div className={TD}>{formatRecTime(rec.recTime)}</div>
            </div>
            <div className="grid grid-cols-[90px_1fr_90px_1fr]">
              <div className={TH}>상담원</div>
              <div className={TD}>
                <span className="truncate">
                  {rec.userName}
                  {rec.userId ? ` (${rec.userId})` : ''}
                </span>
              </div>
              <div className={`${TH} border-l`}>콜 ID</div>
              <div className={TD}>
                <span className="truncate">{rec.callId}</span>
              </div>
            </div>
            <div className="grid grid-cols-[90px_1fr_90px_1fr]">
              <div className={TH}>전화번호</div>
              <div className={TD}>
                <span className="truncate">{rec.custTel}</span>
              </div>
              <div className={`${TH} border-l`}>통화시간</div>
              <div className={TD}>{formatCallTime(rec.endTime)}</div>
            </div>
          </div>
        )}

        {/* 플레이어 */}
        <div className="mx-4 my-3 p-5 bg-gray-50 rounded border border-gray-200">
          {!rec ? (
            <p className="text-center text-sm text-red-500 py-2">녹취 키가 없습니다.</p>
          ) : error ? (
            <p className="text-center text-sm text-red-500 py-2">음원을 불러올 수 없습니다. MFU 서버 접근 불가 또는 파일이 없습니다.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {/* 채널 + 범례 */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">채널</span>
                {(['MIX', 'TX', 'RX'] as ChannelMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => applyChannel(mode)}
                    className={`px-3 py-0.5 text-xs rounded border transition-colors ${
                      channel === mode ? 'bg-gray-700 text-white border-gray-700' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-500'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
                <div className="ml-auto flex items-center gap-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-3 h-2 rounded-sm bg-green-300" />
                    TX(상담원)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-3 h-2 rounded-sm bg-blue-300" />
                    RX(고객)
                  </span>
                </div>
              </div>

              {/* 파형 */}
              <div ref={waveformRef} className={`transition-opacity duration-300 ${loading ? 'opacity-30' : 'opacity-100'}`} />
              {loading && statusMsg && <p className="text-xs text-blue-500 text-center -mt-2">{statusMsg}</p>}

              {/* 시간 */}
              <div className="flex justify-between text-xs text-gray-400">
                <span>{formatTime(current)}</span>
                <span>{formatTime(duration)}</span>
              </div>

              {/* 구간 반복 안내 */}
              {loopEnabled && (
                <div className="flex items-center gap-2 text-xs -mt-1">
                  {regionRange ? (
                    <>
                      <span className="text-amber-600">
                        반복 구간 {formatTime(regionRange.start)} ~ {formatTime(regionRange.end)}
                      </span>
                      <button onClick={handleClearRegion} className="text-gray-400 hover:text-gray-600 underline">
                        구간 해제
                      </button>
                    </>
                  ) : (
                    <span className="text-amber-600">파형을 드래그해 반복할 구간을 지정하세요.</span>
                  )}
                </div>
              )}

              {/* 컨트롤 */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => wsRef.current?.skip(-10)}
                  disabled={loading}
                  title="10초 뒤로"
                  className="px-2.5 h-8 rounded text-xs font-medium text-gray-600 bg-white border border-gray-300 hover:bg-gray-100 disabled:opacity-40 transition-colors"
                >
                  ‹ 10s
                </button>

                <button
                  onClick={() => wsRef.current?.playPause()}
                  disabled={loading}
                  className="w-10 h-10 rounded-full bg-gray-700 text-white flex items-center justify-center hover:bg-gray-600 disabled:opacity-40 flex-shrink-0 transition-colors"
                >
                  {loading ? (
                    <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                    </svg>
                  ) : playing ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="6" y="4" width="4" height="16" />
                      <rect x="14" y="4" width="4" height="16" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>

                <button
                  onClick={handleStop}
                  disabled={loading}
                  title="정지"
                  className="w-9 h-9 rounded-full bg-white text-gray-600 border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-40 flex-shrink-0 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="5" y="5" width="14" height="14" rx="1.5" />
                  </svg>
                </button>

                <button
                  onClick={() => wsRef.current?.skip(10)}
                  disabled={loading}
                  title="10초 앞으로"
                  className="px-2.5 h-8 rounded text-xs font-medium text-gray-600 bg-white border border-gray-300 hover:bg-gray-100 disabled:opacity-40 transition-colors"
                >
                  10s ›
                </button>

                <button
                  onClick={handleToggleLoop}
                  disabled={loading}
                  title="구간 반복 (파형을 드래그해 구간 지정)"
                  className={`px-2.5 h-8 rounded text-xs font-medium border transition-colors disabled:opacity-40 ${
                    loopEnabled ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  ⟲ 구간반복
                </button>

                <div className="flex-1" />

                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">배속</span>
                  <select
                    value={speed}
                    onChange={(e) => handleSpeedChange(Number(e.target.value))}
                    className="text-xs border border-gray-300 rounded px-1.5 py-0.5 bg-white text-gray-700"
                  >
                    {SPEEDS.map((s) => (
                      <option key={s} value={s}>
                        {speedLabel(s)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-gray-400 flex-shrink-0">
                    {volume === 0 ? (
                      <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                    ) : volume < 0.5 ? (
                      <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" />
                    ) : (
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                    )}
                  </svg>
                  <input type="range" min={0} max={1} step={0.05} value={volume} onChange={(e) => handleVolumeChange(Number(e.target.value))} className="w-20 accent-gray-600" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 재생목록 */}
        {playlist.length > 1 && (
          <div className="mx-4 mb-4">
            <p className="text-xs text-gray-500 mb-1.5">재생목록 ({playlist.length}건)</p>
            <div className="border border-gray-200 rounded overflow-hidden text-xs max-h-48 overflow-y-auto">
              <div className="grid grid-cols-[24px_160px_1fr_1fr_120px_72px] bg-gray-100 border-b border-gray-200 font-medium text-gray-600 sticky top-0">
                <div className="px-2 py-1.5" />
                <div className="px-2 py-1.5">통화일시</div>
                <div className="px-2 py-1.5">상담원</div>
                <div className="px-2 py-1.5">콜 ID</div>
                <div className="px-2 py-1.5">전화번호</div>
                <div className="px-2 py-1.5 text-right">통화시간</div>
              </div>
              {playlist.map((row, i) => {
                const isCurrent = i === currentIndex;
                return (
                  <div
                    key={row.recKey}
                    onClick={() => handleRowClick(i)}
                    className={`grid grid-cols-[24px_160px_1fr_1fr_120px_72px] border-b border-gray-100 last:border-b-0 cursor-pointer transition-colors ${
                      isCurrent ? 'bg-blue-50 text-blue-800' : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-center py-1.5">
                      {isCurrent && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-blue-500">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      )}
                    </div>
                    <div className="px-2 py-1.5 truncate">{formatRecTime(row.recTime)}</div>
                    <div className="px-2 py-1.5 truncate">
                      {row.userName}
                      {row.userId ? ` (${row.userId})` : ''}
                    </div>
                    <div className="px-2 py-1.5 truncate">{row.callId}</div>
                    <div className="px-2 py-1.5 truncate">{row.custTel}</div>
                    <div className="px-2 py-1.5 text-right">{formatCallTime(row.endTime)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
