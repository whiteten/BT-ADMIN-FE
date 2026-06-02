import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Pause, Play, Volume2, VolumeX } from 'lucide-react';
import type { SttSearchListenParsed } from '../types';
import { cn } from '@/lib/utils';

export interface SttAudioPlayerRef {
  seekMs: (ms: number) => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const BAR_COUNT = 400;
const SVG_H = 52;
const CENTER = SVG_H / 2;
const MAX_HALF = CENTER - 2;

function WaveformDisplay({ waveData, progress, onSeek, highlights = [] }: { waveData: number[] | null; progress: number; onSeek: (ratio: number) => void; highlights?: number[] }) {
  const svgRef = useRef<SVGSVGElement>(null);

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    onSeek((e.clientX - rect.left) / rect.width);
  };

  if (!waveData || waveData.length === 0) {
    return (
      <div className="flex h-14 items-center justify-center rounded-md bg-slate-100">
        <span className="text-[11px] text-slate-400">파형 데이터 없음</span>
      </div>
    );
  }

  const total = waveData.length;
  const samples: number[] = Array.from({ length: BAR_COUNT }, (_, i) => {
    const from = Math.floor((i / BAR_COUNT) * total);
    const to = Math.floor(((i + 1) / BAR_COUNT) * total);
    let sum = 0;
    for (let j = from; j < to; j++) sum += Math.abs(waveData[j] ?? 0);
    return to > from ? sum / (to - from) : 0;
  });

  const maxVal = Math.max(...samples, 0.01);
  const progressIdx = Math.floor(progress * BAR_COUNT);

  return (
    <svg ref={svgRef} viewBox={`0 0 ${BAR_COUNT} ${SVG_H}`} preserveAspectRatio="none" className="h-14 w-full cursor-pointer" onClick={handleClick}>
      <line x1={0} y1={CENTER} x2={BAR_COUNT} y2={CENTER} stroke="#f1f5f9" strokeWidth={0.5} />
      {samples.map((val, i) => {
        const halfH = Math.max(1, (val / maxVal) * MAX_HALF);
        const isPast = i <= progressIdx;
        return <rect key={i} x={i + 0.1} y={CENTER - halfH} width={0.8} height={halfH * 2} rx={0.4} fill={isPast ? '#60a5fa' : '#e2e8f0'} />;
      })}
      {highlights.map((ratio, i) => {
        const x = Math.floor(ratio * BAR_COUNT) + 0.5;
        return <line key={i} x1={x} y1={0} x2={x} y2={SVG_H} stroke="#f59e0b" strokeWidth={1.5} opacity={0.7} />;
      })}
      {progress > 0 && progress < 1 && <line x1={progressIdx + 0.5} y1={0} x2={progressIdx + 0.5} y2={SVG_H} stroke="#2563eb" strokeWidth={0.8} />}
    </svg>
  );
}

interface SttAudioPlayerProps {
  listenData: SttSearchListenParsed;
  onTimeUpdate?: (ms: number) => void;
  autoPlay?: boolean;
  className?: string;
  highlights?: number[]; // ms 단위 armsoffset 목록
}

const SttAudioPlayer = forwardRef<SttAudioPlayerRef, SttAudioPlayerProps>(({ listenData, onTimeUpdate, autoPlay, className, highlights }, ref) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    seekMs: (ms: number) => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.currentTime = ms / 1000;
    },
  }));

  useEffect(() => {
    if (!listenData.audioBlob) return;
    const url = URL.createObjectURL(listenData.audioBlob);
    setBlobUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [listenData.audioBlob]);

  useEffect(() => {
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [blobUrl]);

  if (!blobUrl) return null;

  const progress = duration > 0 ? currentTime / duration : 0;

  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      void audio.play();
    }
  };

  const handleSeekByRatio = (ratio: number) => {
    const audio = audioRef.current;
    if (!audio || duration === 0) return;
    audio.currentTime = Math.max(0, Math.min(1, ratio)) * duration;
  };

  const handleSeekSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleSeekByRatio(Number(e.target.value) / 100);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = Number(e.target.value) / 100;
    setVolume(vol);
    if (audioRef.current) {
      audioRef.current.volume = vol;
      if (vol > 0) setMuted(false);
    }
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const next = !muted;
    audio.muted = next;
    setMuted(next);
  };

  const handleTimeUpdate = () => {
    const t = audioRef.current?.currentTime ?? 0;
    setCurrentTime(t);
    onTimeUpdate?.(t * 1000);
  };

  return (
    <div className={cn('flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm', className)}>
      <audio
        ref={audioRef}
        src={blobUrl}
        autoPlay={autoPlay}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setCurrentTime(0);
          onTimeUpdate?.(0);
        }}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
      />

      <WaveformDisplay
        waveData={listenData.waveData}
        progress={progress}
        onSeek={handleSeekByRatio}
        highlights={duration > 0 && highlights?.length ? highlights.map((ms) => ms / (duration * 1000)) : []}
      />

      <div className="flex items-center gap-3">
        <button onClick={handlePlayPause} className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-500 transition-colors hover:bg-blue-600">
          {playing ? <Pause size={14} className="text-white" fill="white" /> : <Play size={14} className="text-white" fill="white" />}
        </button>

        <div className="flex flex-1 items-center gap-2">
          <span className="flex-shrink-0 tabular-nums text-[11px] text-slate-500">{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={100}
            step={0.1}
            value={duration > 0 ? progress * 100 : 0}
            onChange={handleSeekSlider}
            className="h-1 flex-1 cursor-pointer accent-blue-500"
          />
          <span className="flex-shrink-0 tabular-nums text-[11px] text-slate-500">{formatTime(duration)}</span>
        </div>

        <div className="flex flex-shrink-0 items-center gap-1.5">
          <button onClick={toggleMute} className="text-slate-400 transition-colors hover:text-slate-600">
            {muted || volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
          <input type="range" min={0} max={100} value={muted ? 0 : volume * 100} onChange={handleVolumeChange} className="h-1 w-16 cursor-pointer accent-blue-500" />
        </div>
      </div>
    </div>
  );
});

SttAudioPlayer.displayName = 'SttAudioPlayer';
export default SttAudioPlayer;
