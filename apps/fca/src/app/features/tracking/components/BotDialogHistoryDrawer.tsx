import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Descriptions, Drawer, Input, Select, Spin, message } from 'antd';
import { Bookmark, Brain, Check, Copy, Minus, Pencil, Plus, RotateCcw, Volume2, X } from 'lucide-react';
import { toast } from '@/shared-util';
import BubbleDecryptReasonModal, { type BubbleDecryptReason } from './BubbleDecryptReasonModal';
import TrackingDialogView from './TrackingDialogView';
import { useApplyRetrain, useGetIntents, useUpdateRetrain } from '../../bot-config/hooks/useModelQueries';
import { botDialogHistoryApi } from '../api/botDialogHistoryApi';
import { botDialogHistoryQueryKeys, useDecryptBubbles, useGetBubbles, useGetDialogHistoryConfig, useGetNluAnalysis } from '../hooks/useBotDialogHistoryQueries';
import type { BotDialogHistoryListItem } from '../types/botDialogHistory.types';
import type { NluAnalysisItem, TrackingFlowItem } from '../types/tracking.types';
import { cn } from '@/lib/utils';

/** HTTP/HTTPS 환경 모두에서 동작하는 클립보드 복사 */
function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }
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

/** confidence 값 기반 텍스트 색상 */
function getConfidenceTextColor(item: NluAnalysisItem): string {
  if (item.isSuccess === 1) return 'text-green-600';
  if (item.isCheck === 1) return 'text-amber-500';
  if (item.isFailed === 1) return 'text-red-500';
  return 'text-gray-500';
}

/** NLU 카드 단일 항목 */
interface NluCardProps {
  seq: number;
  nluResults: NluAnalysisItem[];
  onRetrainSuccess?: () => void | Promise<void>;
}

function NluCard({ seq, nluResults, onRetrainSuccess }: NluCardProps) {
  const [editingHop, setEditingHop] = useState<number | null>(null);
  const [editQuestion, setEditQuestion] = useState('');
  const [editAnswer, setEditAnswer] = useState('');

  const modelId = nluResults[0]?.modelId;
  const { data: intentList } = useGetIntents({
    params: { modelId: modelId ?? '' },
    queryOptions: { enabled: !!modelId && editingHop !== null },
  });
  const intentOptions = (intentList ?? []).map((item) => ({
    value: item.intentName,
    label: item.intentName,
  }));

  const updateMutation = useUpdateRetrain({});
  const applyMutation = useApplyRetrain({});

  const handleEditStart = (nlu: NluAnalysisItem) => {
    if (nlu.retrainStatus === 2) return;
    setEditingHop(nlu.hop);
    setEditQuestion((nlu.modifiedQuestion ?? nlu.questionText ?? '').trim());
    setEditAnswer(nlu.retrainAnswer ?? nlu.intent ?? '');
  };

  const handleEditCancel = () => {
    setEditingHop(null);
    setEditQuestion('');
    setEditAnswer('');
  };

  const handleSave = async (nlu: NluAnalysisItem) => {
    if (!editQuestion.trim() || !editAnswer.trim()) {
      toast.error('발화와 정답의도를 모두 입력해주세요.');
      return;
    }
    try {
      await updateMutation.mutateAsync({
        params: {
          modelId: nlu.modelId,
          ucidGkey: nlu.ucidGkey,
          questionSeq: nlu.questionSeq,
          hop: nlu.hop,
        },
        data: { question: editQuestion, answer: editAnswer },
      });
      toast.success('재학습 데이터가 저장되었습니다.');
      await onRetrainSuccess?.();
      setEditingHop(null);
    } catch (e) {
      toast.error('저장에 실패했습니다.');
    }
  };

  const handleApply = async (nlu: NluAnalysisItem) => {
    const question = nlu.modifiedQuestion ?? nlu.questionText;
    const answer = nlu.retrainAnswer ?? nlu.intent;
    if (!question?.trim() || !answer?.trim()) {
      toast.error('발화와 정답의도를 먼저 저장해주세요.');
      return;
    }
    try {
      await applyMutation.mutateAsync({
        params: {
          modelId: nlu.modelId,
          ucidGkey: nlu.ucidGkey,
          questionSeq: nlu.questionSeq,
          hop: nlu.hop,
        },
        data: {},
      });
      toast.success('학습 데이터에 반영되었습니다.');
      await onRetrainSuccess?.();
    } catch (e) {
      toast.error('반영에 실패했습니다.');
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      {nluResults.map((nlu, idx) => (
        <div key={nlu.hop} className={cn('p-3 space-y-2.5', idx > 0 && 'border-t border-gray-100')} {...(editingHop === nlu.hop ? { 'data-retrain-edit': true } : {})}>
          {/* HOP 헤더 + 재학습 상태 + 편집 버튼 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {nluResults.length > 1 && <span className="inline-block text-[10px] font-semibold text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">HOP {nlu.hop}</span>}
              {nlu.retrainStatus === 1 && <span className="text-[10px] font-medium text-amber-600 bg-amber-50 rounded px-1.5 py-0.5">미반영</span>}
              {nlu.retrainStatus === 2 && <span className="text-[10px] font-medium text-green-600 bg-green-50 rounded px-1.5 py-0.5">반영</span>}
            </div>
            {nlu.retrainStatus !== 2 && editingHop !== nlu.hop && (
              <button
                type="button"
                title="재학습 편집"
                className="p-0.5 rounded hover:bg-gray-100 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditStart(nlu);
                }}
              >
                <Pencil size={12} className="text-gray-400 hover:text-blue-500" />
              </button>
            )}
          </div>

          {/* 의도 */}
          <div className="flex gap-2">
            <span className="w-12 shrink-0 text-[11px] font-semibold text-gray-500 leading-5">의도</span>
            {editingHop === nlu.hop ? (
              <Select
                size="small"
                className="flex-1"
                value={editAnswer}
                onChange={setEditAnswer}
                options={intentOptions}
                showSearch
                filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                placeholder="정답의도 선택"
              />
            ) : (
              <span className="text-xs font-medium text-gray-800">{nlu.retrainAnswer ?? nlu.intent ?? '-'}</span>
            )}
          </div>

          {/* 신뢰도 / 성공 / 실패 */}
          {(nlu.confidence != null || nlu.threshold != null || nlu.thresholdFail != null) && (
            <div className="flex gap-2">
              <span className="w-12 shrink-0" />
              <div className="flex items-center gap-3 text-[10px] text-gray-400">
                {nlu.confidence != null && (
                  <span>
                    신뢰도 <span className={cn('font-medium', getConfidenceTextColor(nlu))}>{nlu.confidence}</span>
                  </span>
                )}
                {nlu.threshold != null && (
                  <span>
                    성공 <span className="text-green-600 font-medium">{nlu.threshold}</span>
                  </span>
                )}
                {nlu.thresholdFail != null && (
                  <span>
                    실패 <span className="text-red-500 font-medium">{nlu.thresholdFail}</span>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* 고객발화 */}
          <div className="flex gap-2">
            <span className="w-12 shrink-0 text-[11px] font-semibold text-gray-500 leading-5">고객발화</span>
            {editingHop === nlu.hop ? (
              <Input size="small" className="flex-1" value={editQuestion} onChange={(e) => setEditQuestion(e.target.value)} placeholder="사용자 발화 수정" />
            ) : (
              <p className="flex-1 text-xs text-gray-700 leading-5 break-all">{nlu.modifiedQuestion ?? nlu.questionText}</p>
            )}
          </div>

          {/* 키워드 */}
          {nlu.keywords && nlu.keywords.length > 0 && (
            <div className="flex gap-2">
              <span className="w-12 shrink-0 text-[11px] font-semibold text-gray-500 leading-5">키워드</span>
              <div className="flex-1 flex flex-wrap gap-1">
                {nlu.keywords.map((kw, i) => (
                  <span key={i} className="inline-flex items-center text-[11px] bg-violet-50 text-violet-700 rounded px-1.5 py-0.5">
                    {kw.keyword}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 개체 */}
          {nlu.isEntity === 1 && (
            <div className="flex gap-2">
              <span className="w-12 shrink-0 text-[11px] font-semibold text-gray-500 leading-5">개체</span>
              <div className="flex-1 flex flex-wrap gap-1">
                {nlu.entities.length > 0 ? (
                  nlu.entities.map((ent, i) => (
                    <span key={i} className="inline-flex items-center gap-0.5 text-[11px] bg-emerald-50 text-emerald-700 rounded px-1.5 py-0.5">
                      <span className="font-medium">{ent.entityTag}</span>
                      <span className="text-emerald-400">:</span>
                      <span>{ent.entityValue}</span>
                    </span>
                  ))
                ) : (
                  <span className="text-[11px] text-gray-400">추출된 개체 없음</span>
                )}
              </div>
            </div>
          )}

          {/* 재학습 액션 버튼 */}
          {editingHop === nlu.hop ? (
            <div className="flex items-center gap-1.5 pt-1 border-t border-gray-100">
              <button
                type="button"
                className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-white bg-blue-500 hover:bg-blue-600 rounded transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSave(nlu);
                }}
                disabled={updateMutation.isPending}
              >
                <Check size={11} /> 저장
              </button>
              <button
                type="button"
                className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-white bg-gray-400 hover:bg-gray-500 rounded transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditCancel();
                }}
              >
                <X size={11} /> 취소
              </button>
            </div>
          ) : (
            nlu.retrainStatus === 1 && (
              <div className="flex items-center gap-1.5 pt-1 border-t border-gray-100">
                <button
                  type="button"
                  className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-white bg-green-500 hover:bg-green-600 rounded transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleApply(nlu);
                  }}
                  disabled={applyMutation.isPending}
                >
                  <Bookmark size={11} /> 반영
                </button>
              </div>
            )
          )}
        </div>
      ))}
    </div>
  );
}

/** "HH:mm:ss" → 초 (파싱 실패 시 null) */
function hhmmssToSec(v: string | null | undefined): number | null {
  if (!v) return null;
  const m = /^(\d{1,2}):(\d{2}):(\d{2})$/.exec(v.trim());
  if (!m) return null;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

/** items의 첫 유효 startTime을 기준(t=0)으로 각 버블의 초 단위 오프셋 테이블 생성 */
function buildAudioOffsets(items: TrackingFlowItem[]): (number | null)[] {
  let baseSec: number | null = null;
  return items.map((it) => {
    const sec = hhmmssToSec(it.startTime);
    if (sec == null) return null;
    if (baseSec == null) baseSec = sec;
    let diff = sec - baseSec;
    if (diff < 0) diff += 86400; // 자정 경계 보정
    return diff;
  });
}

/** currentTime 이하의 오프셋 중 가장 마지막 인덱스 (= 현재 재생 중인 버블) */
function findPlayingIdx(offsets: (number | null)[], currentTime: number): number | null {
  let found: number | null = null;
  for (let i = 0; i < offsets.length; i++) {
    const o = offsets[i];
    if (o == null) continue;
    if (o <= currentTime) found = i;
    else break;
  }
  return found;
}

/** 싱크 오프셋 저장 키 (사용자 브라우저 전역 설정) */
const SYNC_OFFSET_STORAGE_KEY = 'bt-audio-sync-offset';
/** 싱크 조절 단위 (초) */
const SYNC_STEP = 0.5;
/** 싱크 조절 범위 (초) */
const SYNC_MIN = -30;
const SYNC_MAX = 30;

function loadSyncOffset(): number {
  if (typeof window === 'undefined') return 0;
  const stored = window.localStorage.getItem(SYNC_OFFSET_STORAGE_KEY);
  const parsed = stored == null ? 0 : Number(stored);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(SYNC_MAX, Math.max(SYNC_MIN, parsed));
}

function formatSync(sec: number): string {
  if (Math.abs(sec) < 0.05) return '0.0s';
  const sign = sec > 0 ? '+' : '−';
  return `${sign}${Math.abs(sec).toFixed(1)}s`;
}

export interface AudioPlayerRef {
  /** 버블 인덱스에 해당하는 시점으로 seek 후 자동 재생 */
  seekToIdx: (idx: number) => void;
}

interface AudioPlayerProps {
  ucid: string;
  nextHop: number;
  cdrPkey: number;
  /** 버블 목록 (시점 매핑용) */
  items: TrackingFlowItem[];
  /** 재생 시점에 해당하는 버블 인덱스 변경 콜백 */
  onPlayingIdxChange: (idx: number | null) => void;
}

/**
 * 녹취 오디오 플레이어.
 * - timeupdate로 현재 재생 중인 버블 인덱스를 상위에 통지
 * - seekToIdx(idx)를 ref로 노출하여 버블 클릭 → 해당 시점으로 이동
 */
const AudioPlayer = forwardRef<AudioPlayerRef, AudioPlayerProps>(function AudioPlayer({ ucid, nextHop, cdrPkey, items, onPlayingIdxChange }, ref) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const lastIdxRef = useRef<number | null>(null);
  // 버블 하이라이트 싱크 보정값 (초). 양수 = 하이라이트 지연, 음수 = 선행.
  const [syncOffset, setSyncOffset] = useState<number>(loadSyncOffset);

  const offsets = useMemo(() => buildAudioOffsets(items), [items]);

  // 사용자 브라우저 전역 설정으로 저장
  useEffect(() => {
    try {
      window.localStorage.setItem(SYNC_OFFSET_STORAGE_KEY, String(syncOffset));
    } catch (e) {
      console.warn('failed to persist sync offset', e);
    }
  }, [syncOffset]);

  const adjustSync = useCallback((delta: number) => {
    setSyncOffset((prev) => {
      const next = Math.round((prev + delta) * 10) / 10;
      return Math.min(SYNC_MAX, Math.max(SYNC_MIN, next));
    });
  }, []);
  const resetSync = useCallback(() => setSyncOffset(0), []);

  useImperativeHandle(ref, () => ({
    seekToIdx(idx: number) {
      const audio = audioRef.current;
      if (!audio) return;
      const sec = offsets[idx];
      if (sec == null) return;
      // 버블 오프셋 → 실제 오디오 시점은 syncOffset 만큼 뒤 (매칭 규칙의 역산)
      try {
        audio.currentTime = Math.max(0, sec + syncOffset);
      } catch (e) {
        console.warn('audio seek failed', e);
        return;
      }
      const playPromise = audio.play();
      if (playPromise) playPromise.catch((e) => console.warn('audio play aborted', e));
    },
  }));

  // 싱크 변경 시 즉시 하이라이트 재평가 (일시정지 상태에서도 반영)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const idx = findPlayingIdx(offsets, audio.currentTime - syncOffset);
    if (idx !== lastIdxRef.current) {
      lastIdxRef.current = idx;
      onPlayingIdxChange(idx);
    }
  }, [syncOffset, offsets, onPlayingIdxChange]);

  useEffect(() => {
    let revoked = false;
    lastIdxRef.current = null;
    setLoading(true);
    setError(false);
    setAudioUrl(null);
    botDialogHistoryApi
      .getAudioBlob({ ucid, nextHop, cdrPkey })
      .then((blob) => {
        if (revoked) return;
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
      })
      .catch((e) => {
        if (revoked) return;
        console.warn('audio load failed', e);
        setError(true);
      })
      .finally(() => {
        if (!revoked) setLoading(false);
      });
    return () => {
      revoked = true;
      setAudioUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [ucid, nextHop, cdrPkey]);

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const idx = findPlayingIdx(offsets, audio.currentTime - syncOffset);
    if (idx === lastIdxRef.current) return;
    lastIdxRef.current = idx;
    onPlayingIdxChange(idx);
  };

  const handleEnded = () => {
    lastIdxRef.current = null;
    onPlayingIdxChange(null);
  };

  if (loading) return <Spin size="small" />;
  if (error) return <span className="text-xs text-red-400">녹취 파일을 불러올 수 없습니다.</span>;
  if (!audioUrl) return null;

  const syncAtMin = syncOffset <= SYNC_MIN + 0.0001;
  const syncAtMax = syncOffset >= SYNC_MAX - 0.0001;
  const syncIsZero = Math.abs(syncOffset) < 0.05;

  return (
    <div className="flex items-center gap-2 w-full">
      <audio ref={audioRef} controls src={audioUrl} className="h-8 flex-1 min-w-0" preload="auto" onTimeUpdate={handleTimeUpdate} onEnded={handleEnded} />
      {/* 싱크 미세조정 — 0.5초 단위 */}
      <div className="flex items-center gap-0.5 shrink-0 rounded-md border border-gray-200 bg-white px-1 py-0.5 shadow-sm" title="버블 하이라이트와 녹취 재생의 싱크 조정">
        <button
          type="button"
          onClick={() => adjustSync(-SYNC_STEP)}
          disabled={syncAtMin}
          className="p-1 rounded text-gray-500 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="하이라이트 0.5초 빠르게"
          title="하이라이트 0.5초 빠르게"
        >
          <Minus size={12} strokeWidth={2.5} />
        </button>
        <button
          type="button"
          onClick={resetSync}
          disabled={syncIsZero}
          className={cn(
            'flex items-center gap-0.5 min-w-[48px] justify-center px-1.5 py-0.5 text-[11px] font-medium tabular-nums rounded transition-colors',
            syncIsZero ? 'text-gray-500 cursor-default' : 'text-blue-700 bg-blue-50 hover:bg-blue-100 cursor-pointer',
          )}
          aria-label={syncIsZero ? '싱크 0초 (기준)' : '클릭하여 0초로 초기화'}
          title={syncIsZero ? '싱크 오프셋 없음' : '클릭하여 0초로 초기화'}
        >
          {!syncIsZero && <RotateCcw size={10} strokeWidth={2.5} />}
          <span>{formatSync(syncOffset)}</span>
        </button>
        <button
          type="button"
          onClick={() => adjustSync(SYNC_STEP)}
          disabled={syncAtMax}
          className="p-1 rounded text-gray-500 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="하이라이트 0.5초 느리게"
          title="하이라이트 0.5초 느리게"
        >
          <Plus size={12} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
});

export interface BotDialogHistoryDrawerRef {
  open: (row: BotDialogHistoryListItem) => void;
  close: () => void;
}

const BotDialogHistoryDrawer = forwardRef<BotDialogHistoryDrawerRef>((_, ref) => {
  const queryClient = useQueryClient();
  const { data: featureConfig } = useGetDialogHistoryConfig();
  const mediaPlayerEnabled = featureConfig?.mediaPlayerEnabled ?? false;
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<BotDialogHistoryListItem | null>(null);
  const [highlightedNluSeq, setHighlightedNluSeq] = useState<number | null>(null);
  const nluCardRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 녹취 재생 하이라이트 상태
  const [audioPlayingIdx, setAudioPlayingIdx] = useState<number | null>(null);
  const bubbleRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const itemsRef = useRef<TrackingFlowItem[]>([]);
  const audioPlayerRef = useRef<AudioPlayerRef>(null);

  const setBubbleRef = useCallback((idx: number, el: HTMLDivElement | null) => {
    if (el) bubbleRefs.current.set(idx, el);
    else bubbleRefs.current.delete(idx);
  }, []);

  // 재생 중 버블 변경 시 자동 스크롤
  useEffect(() => {
    if (audioPlayingIdx == null) return;
    const el = bubbleRefs.current.get(audioPlayingIdx);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [audioPlayingIdx]);

  // 🔒 암호화 버블 복호화 상태
  const [reasonModalOpen, setReasonModalOpen] = useState(false);
  const [targetBubbleKey, setTargetBubbleKey] = useState<string | null>(null);
  const [revealedBubbles, setRevealedBubbles] = useState<Record<string, string>>({});

  useImperativeHandle(ref, () => ({
    open: (row: BotDialogHistoryListItem) => {
      setSelectedRow(row);
      setHighlightedNluSeq(null);
      nluCardRefs.current.clear();
      setRevealedBubbles({});
      setReasonModalOpen(false);
      setTargetBubbleKey(null);
      setAudioPlayingIdx(null);
      setIsOpen(true);
    },
    close: () => {
      setIsOpen(false);
      setSelectedRow(null);
      setHighlightedNluSeq(null);
      setRevealedBubbles({});
      setReasonModalOpen(false);
      setTargetBubbleKey(null);
      setAudioPlayingIdx(null);
    },
  }));

  const handleClose = () => {
    setIsOpen(false);
    setSelectedRow(null);
    setHighlightedNluSeq(null);
    setRevealedBubbles({});
    setReasonModalOpen(false);
    setTargetBubbleKey(null);
    setAudioPlayingIdx(null);
  };

  const setNluCardRef = useCallback((seq: number, el: HTMLDivElement | null) => {
    if (el) nluCardRefs.current.set(seq, el);
  }, []);

  const handleBubbleClick = useCallback((item: TrackingFlowItem) => {
    // 녹취가 로드되어 있으면 해당 버블 시점으로 seek + 재생
    const idx = itemsRef.current.findIndex((i) => i === item);
    if (idx >= 0) audioPlayerRef.current?.seekToIdx(idx);

    // 고객 버블 클릭 → NLU 카드 하이라이트
    if (item.dialogRole !== 'CUSTOMER') return;
    setHighlightedNluSeq(item.seq);
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => setHighlightedNluSeq(null), 1200);
    setTimeout(() => {
      const el = nluCardRefs.current.get(item.seq);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  }, []);

  const handleRetrainSuccess = useCallback(async () => {
    if (!selectedRow) return;
    await queryClient.invalidateQueries({
      queryKey: botDialogHistoryQueryKeys.getNluAnalysis({
        ucid: selectedRow.ucid,
      }).queryKey,
    });
  }, [selectedRow, queryClient]);

  // 암호화 버블 복호화 mutation — 캐시하지 않고 결과만 state에 병합
  const decryptMutation = useDecryptBubbles({
    mutationOptions: {
      onSuccess: (decrypted) => {
        if (!decrypted || decrypted.length === 0) return;
        setRevealedBubbles((prev) => {
          const next = { ...prev };
          for (const row of decrypted) {
            next[row.bubbleKey] = row.description;
          }
          return next;
        });
      },
    },
  });

  /** 🔒 아이콘 클릭 → 사유 모달 오픈 */
  const handleEncryptedClick = useCallback((item: TrackingFlowItem) => {
    if (!item.bubbleKey) return;
    setTargetBubbleKey(item.bubbleKey);
    setReasonModalOpen(true);
  }, []);

  /** 사유 확인 → 복호화 API 호출 */
  const handleConfirmReason = useCallback(
    async ({ reasonCode, reasonText }: BubbleDecryptReason) => {
      if (!selectedRow || !targetBubbleKey) return;
      try {
        await decryptMutation.mutateAsync({
          params: { ucid: selectedRow.ucid },
          data: { bubbleKeys: [targetBubbleKey], reasonCode, reasonText },
        });
        setReasonModalOpen(false);
        setTargetBubbleKey(null);
      } catch (e) {
        // 에러 토스트는 글로벌 핸들러에서 처리
      }
    },
    [selectedRow, targetBubbleKey, decryptMutation],
  );

  const handleCancelReason = useCallback(() => {
    if (decryptMutation.isPending) return;
    setReasonModalOpen(false);
    setTargetBubbleKey(null);
  }, [decryptMutation.isPending]);

  const { data: bubbleData, isLoading: isBubbleLoading } = useGetBubbles({
    params: {
      ucid: selectedRow?.ucid,
    },
    queryOptions: { enabled: !!selectedRow && isOpen },
  });

  // NLU 분석 결과 별도 조회 (경량 — 재학습 갱신 시 이 쿼리만 invalidate)
  const { data: nluData } = useGetNluAnalysis({
    params: { ucid: selectedRow?.ucid },
    queryOptions: { enabled: !!selectedRow && isOpen },
  });

  const items: TrackingFlowItem[] = bubbleData ?? [];
  itemsRef.current = items;

  // NLU 데이터를 questionSeq 기준으로 그룹핑하여 고객 발화 버블과 매칭
  const nluBySeq = useMemo(() => {
    const map = new Map<number, NluAnalysisItem[]>();
    if (!nluData) return map;
    for (const nlu of nluData) {
      const list = map.get(nlu.questionSeq) ?? [];
      list.push(nlu);
      map.set(nlu.questionSeq, list);
    }
    return map;
  }, [nluData]);

  // 고객 발화 중 NLU 데이터가 있는 항목 추출 (NLU 별도 쿼리 기준)
  const nluItems = items.filter((item) => item.dialogRole === 'CUSTOMER' && nluBySeq.has(item.seq)).map((item) => ({ ...item, nluResults: nluBySeq.get(item.seq)! }));
  const hasNluData = nluItems.length > 0;

  const handleIfeLink = useCallback(
    async (item: TrackingFlowItem) => {
      if (!selectedRow || !item.subFlowId || !item.nodeName) return;
      try {
        const redirectUrl = await botDialogHistoryApi.getIfeRedirectUrl({
          serviceId: selectedRow.serviceId,
          serviceVer: selectedRow.serviceVer,
          subFlowId: item.subFlowId,
          nodeName: item.nodeName,
        });
        if (redirectUrl) {
          window.open(redirectUrl, '_blank');
        }
      } catch (e) {
        toast.error('해당 시나리오 버전 또는 플로우를 찾을 수 없습니다.');
      }
    },
    [selectedRow],
  );

  return (
    <Drawer
      open={isOpen}
      onClose={handleClose}
      title="대화 상세"
      closable={{ placement: 'end' }}
      width={960}
      destroyOnHidden
      styles={{ body: { padding: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden' } }}
    >
      <div className="flex flex-col flex-1 min-h-0 gap-4">
        {/* 세션 정보 */}
        {selectedRow && (
          <div className="flex-shrink-0">
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="봇" span={2}>
                {selectedRow.serviceName}
              </Descriptions.Item>
              <Descriptions.Item label="UCID" span={2}>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs">{selectedRow.ucid}</span>
                  <button
                    type="button"
                    title="UCID 복사"
                    onClick={() =>
                      copyToClipboard(selectedRow.ucid)
                        .then(() => message.success('UCID가 복사되었습니다.'))
                        .catch(() => message.error('복사에 실패했습니다.'))
                    }
                    className="flex items-center text-slate-400 hover:text-blue-500 transition-colors"
                  >
                    <Copy size={13} />
                  </button>
                </div>
              </Descriptions.Item>
              <Descriptions.Item label="발신번호">{selectedRow.ani}</Descriptions.Item>
              <Descriptions.Item label="착신번호">{selectedRow.dnis}</Descriptions.Item>
            </Descriptions>

            {/* 녹취 플레이어 */}
            {mediaPlayerEnabled && selectedRow.recordYn === 1 && (
              <div className="flex items-center gap-2 mt-2 p-2 bg-gray-50 rounded-lg">
                <Volume2 size={16} className="text-blue-500 shrink-0" />
                <span className="text-xs font-medium text-gray-600 shrink-0">녹취</span>
                <div className="flex-1">
                  <AudioPlayer
                    ref={audioPlayerRef}
                    ucid={selectedRow.ucid}
                    nextHop={selectedRow.nextHop}
                    cdrPkey={selectedRow.cdrPkey}
                    items={items}
                    onPlayingIdxChange={setAudioPlayingIdx}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* 좌우 분할 영역 */}
        <div className={cn('flex-1 min-h-0 flex gap-4', !hasNluData && 'flex-col')}>
          {/* 왼쪽: 대화 흐름 */}
          <div className={cn('min-h-0 overflow-y-auto overflow-x-hidden pr-1', hasNluData ? 'w-3/5' : 'flex-1')}>
            {isBubbleLoading ? (
              <div className="flex justify-center py-6">
                <Spin />
              </div>
            ) : (
              <TrackingDialogView
                items={items}
                onItemClick={handleBubbleClick}
                onIfeLink={handleIfeLink}
                revealedBubbles={revealedBubbles}
                onEncryptedClick={handleEncryptedClick}
                decryptingBubbleKey={decryptMutation.isPending ? targetBubbleKey : null}
                audioPlayingIdx={audioPlayingIdx}
                onBubbleRef={setBubbleRef}
              />
            )}
          </div>

          {/* 🔒 암호화 버블 열람 사유 모달 */}
          <BubbleDecryptReasonModal open={reasonModalOpen} loading={decryptMutation.isPending} onCancel={handleCancelReason} onConfirm={handleConfirmReason} />

          {/* 오른쪽: NLU 분석 결과 */}
          {hasNluData && (
            <div className="w-2/5 min-h-0 overflow-y-auto border-l pl-4 pr-1">
              <div className="flex items-center gap-2 mb-3 sticky top-0 bg-white pb-2 z-10">
                <Brain className="size-4 text-blue-500" />
                <span className="text-xs font-bold">NLU 분석 결과</span>
                <span className="text-[10px] text-gray-400">({nluItems.length}건)</span>
              </div>

              <div className="space-y-3 pb-4">
                {nluItems.map((item) => (
                  <div
                    key={item.seq}
                    ref={(el) => setNluCardRef(item.seq, el)}
                    className={cn('transition-all duration-300 rounded-lg', highlightedNluSeq === item.seq && 'ring-2 ring-blue-400 ring-offset-2 bg-blue-50/50')}
                  >
                    <NluCard seq={item.seq} nluResults={item.nluResults!} onRetrainSuccess={handleRetrainSuccess} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
});

BotDialogHistoryDrawer.displayName = 'BotDialogHistoryDrawer';

export default BotDialogHistoryDrawer;
