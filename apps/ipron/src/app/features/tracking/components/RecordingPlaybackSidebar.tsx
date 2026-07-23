/**
 * 트래킹 콜 hop 녹취 청취 사이드바 — 파형 플레이어 + hop 메타 정보.
 *
 * 1) eligibility 호출 → 가능 여부 + dnno/callid/filename
 * 2) stream Blob 다운로드 → TrackingAudioPlayer (파형 + 컨트롤)
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Drawer, Spin } from 'antd';
import { CheckCircle2, FileAudio, Headphones, Loader2, Phone, Sparkles, User, X, XCircle } from 'lucide-react';
import ApiClient from '@/shared-util';
import TrackingAudioPlayer from './TrackingAudioPlayer';
import { type RecordingEligibility, recordingApi } from '../api/recordingApi';
import { useTrackingAoe } from '../hooks/useTrackingAoe';
import { type SttHistoryItem, type SttSentence, useTrackingStt } from '../hooks/useTrackingStt';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export interface HopRecordingContext {
  ucid: string;
  hop: number;
  hopLabel?: string;
  agentName?: string | null;
  agentId?: string | number | null;
  ani?: string | null;
  dnis?: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  context: HopRecordingContext | null;
}

export default function RecordingPlaybackSidebar({ open, onClose, context }: Props) {
  const [loading, setLoading] = useState(false);
  const [eligibility, setEligibility] = useState<RecordingEligibility | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  /** 오디오 재생 시각 (초) — STT 결과 자동 포커스용 */
  const [playTimeSec, setPlayTimeSec] = useState(0);
  /** 대화 요약 패널 활성 페이로드 (있으면 Drawer 우측 확장) */
  const [aoePayload, setAoePayload] = useState<{ ucidGkey: string; sentences: SttSentence[] } | null>(null);

  const reset = useCallback(() => {
    setEligibility(null);
    setError(null);
    setBlob(null);
    setAoePayload(null);
  }, []);

  useEffect(() => {
    if (!open || !context) return undefined;
    let cancelled = false;
    setLoading(true);
    reset();
    (async () => {
      try {
        const elig = await recordingApi.eligibility(context.ucid, context.hop);
        if (cancelled) return;
        setEligibility(elig);
        if (!elig?.eligible) {
          setError(elig?.reason ?? '녹취 파일이 존재하지 않습니다');
          return;
        }
        // Blob 직접 받음 (Object URL 은 플레이어 내부에서 생성)
        const r = await apiClient.get<Blob>('/ipron-tracking-recording-stream', {
          params: { ucid: context.ucid, hop: context.hop },
          responseType: 'blob',
        });
        if (cancelled) return;
        // 응답이 mp3 가 아니거나 빈 데이터면 "파일 없음" 처리
        if (!r.data || r.data.size === 0) {
          setError('녹취 파일이 존재하지 않습니다');
          return;
        }
        setBlob(r.data);
      } catch (e) {
        if (cancelled) return;
        // eligibility 통과 후 stream 단계 실패 = VELOCE 에 아직 파일이 없거나(콜 종료 직후),
        // VELOCE 일시 장애 등. 사용자 입장에선 동일한 의미라 일관 메시지로 통일.
        // (디버깅용 원인은 콘솔에만 남김)

        console.warn('[Recording] stream 실패 — 녹취 파일 없음으로 표시:', e);
        setError('녹취 파일이 존재하지 않습니다');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, context, reset]);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  return (
    <Drawer
      title={
        <span className="flex items-center gap-2">
          <Headphones className="size-4 text-blue-600" />
          녹취 청취
        </span>
      }
      placement="right"
      size={aoePayload ? 1120 : 720}
      open={open}
      onClose={onClose}
      styles={{ body: { padding: 16, display: 'flex', gap: 12 } }}
    >
      <div className="flex-1 min-w-0 overflow-y-auto" style={{ maxWidth: aoePayload ? 688 : '100%' }}>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Spin />
            <span className="text-[12px] text-gray-500">녹취 파일 가져오는 중...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 px-8 gap-3 text-center">
            <div className="size-14 rounded-full bg-gray-100 flex items-center justify-center">
              <Headphones className="size-7 text-gray-300" />
            </div>
            <div className="text-[14px] font-medium text-gray-700">{error}</div>
            {error.includes('녹취 파일이 존재하지 않습니다') && (
              <div className="text-[11.5px] text-gray-500 leading-relaxed max-w-[320px]">
                콜이 막 종료된 경우 녹취 솔루션에 파일이 아직 적재되지 않았을 수 있습니다.
                <br />
                잠시 후 다시 시도해 주세요.
              </div>
            )}
            <div className="text-[11px] text-gray-400">
              UCID {context?.ucid?.slice(0, 8)}... · hop {context?.hop}
            </div>
          </div>
        ) : eligibility && blob && context ? (
          <>
            {/* 정보 카드 — 상담사/내선/UCID/녹취 키 */}
            <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-slate-50 to-white p-3 mb-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <InfoCell icon={<User className="size-3.5 text-emerald-600" />} label="상담사" value={context.agentName ?? '-'} />
                <InfoCell icon={<Phone className="size-3.5 text-blue-600" />} label="내선" value={eligibility.dnno ?? '-'} mono />
              </div>
              <div className="border-t border-gray-100 pt-2 space-y-1">
                <InfoRow label="UCID" value={context.ucid} mono />
                <InfoRow label="녹취 키" value={eligibility.callid ?? '-'} mono />
                {eligibility.filename && <InfoRow label="파일명" value={eligibility.filename} mono />}
                <InfoRow label="유형" value={eligibility.hopType === 'IE_EXT' ? '내선' : 'IVR'} />
              </div>
            </div>

            {/* 파형 + 플레이어 */}
            <TrackingAudioPlayer blob={blob} onTimeUpdate={setPlayTimeSec} />

            {/* STT 변환 — TB_BT_CM_APP_MST.APP_ID='stt' 활성화된 경우만 노출 */}
            {eligibility.sttEnabled && eligibility.callid && (
              <SttSection
                blob={blob}
                filename={`${eligibility.callid}.mp3`}
                currentPlayTimeSec={playTimeSec}
                aoeEnabled={eligibility.aoeEnabled}
                onSummarizeClick={(ucidGkey, sentences) => setAoePayload({ ucidGkey, sentences })}
              />
            )}
          </>
        ) : (
          <div className="text-center text-[12px] text-gray-400 py-12">선택된 hop 이 없습니다.</div>
        )}
      </div>

      {/* AOE 대화 요약 패널 — aoePayload 있을 때만 노출 (우측 400px) */}
      {aoePayload && <AoeSummarySection ucidGkey={aoePayload.ucidGkey} sentences={aoePayload.sentences} onClose={() => setAoePayload(null)} />}
    </Drawer>
  );
}

/**
 * 대화 요약 패널 — Drawer 우측 확장 영역. 마운트 시 자동 호출.
 */
function AoeSummarySection({ ucidGkey, sentences, onClose }: { ucidGkey: string; sentences: SttSentence[]; onClose: () => void }) {
  const { result, summarize, reset } = useTrackingAoe();

  useEffect(() => {
    void summarize(ucidGkey, sentences);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ucidGkey]);

  return (
    <div className="w-[400px] flex-shrink-0 flex flex-col rounded-lg border border-violet-200 bg-gradient-to-br from-violet-50/40 to-white overflow-hidden">
      <div className="px-3 py-2 border-b border-violet-200 bg-violet-50 flex items-center gap-2 flex-shrink-0">
        <Sparkles className="size-3.5 text-violet-600" />
        <span className="text-[13px] font-semibold text-gray-800">대화 요약 (AOE)</span>
        <button onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-600">
          <X className="size-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {result.status === 'idle' || result.status === 'summarizing' ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="size-6 animate-spin text-violet-500" />
            <div className="text-[12px] text-gray-600">AOE 가 요약 생성 중...</div>
            <div className="text-[10.5px] text-gray-400 leading-snug text-center max-w-[280px]">
              통화 길이에 따라 수초 ~ 십수초 소요됩니다.
              <br />
              모델이 전체 대화를 한 번에 처리합니다.
            </div>
          </div>
        ) : result.status === 'error' ? (
          <Alert
            type="error"
            showIcon
            icon={<XCircle className="size-4" />}
            message="요약 생성 실패"
            description={result.message ?? '알 수 없는 오류'}
            action={
              <Button size="small" onClick={reset}>
                닫기
              </Button>
            }
          />
        ) : result.status === 'done' && result.result ? (
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-[11px] text-violet-700">
              <CheckCircle2 className="size-3" /> 요약 완료
              <span className="ml-auto text-[10.5px] text-gray-500">{result.result.length}자</span>
            </div>
            <div className="rounded-lg border border-violet-100 bg-white p-3 text-[12.5px] leading-relaxed text-gray-700 whitespace-pre-wrap">{result.result}</div>
            <div className="text-[10.5px] text-gray-400 leading-relaxed">
              ※ 이 요약은 AI 모델이 생성한 것으로, 실제 대화 내용과 일부 차이가 있을 수 있습니다. 중요한 의사 결정 전에 전체 대화 내용을 확인하세요.
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function InfoCell({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-md bg-white border border-gray-200 px-2.5 py-2">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[10.5px] text-gray-500 font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div className={`text-[12.5px] text-gray-900 ${mono ? 'font-mono' : 'font-medium'} break-all`}>{value}</div>
    </div>
  );
}

/** STT 결과 한 문장 — 카카오톡 풍 좌우 버블. rxtxKind: 1=고객(좌), 2=상담원(우), 9=통합(중앙).
 *  active=true 시 오디오 재생 위치와 매칭된 발화로 강조 + 외부에서 scrollIntoView 호출되는 ref 등록.
 *
 *  ※ 화자 라벨 반전 표시 — rxtxKind 데이터는 그대로 두고 화면 표기만 swap.
 *    SWAT 환경에서 rxtxKind 가 실제 의미와 반대로 적재되는 사이트가 있어 표기 보정.
 *    rxtx=1 → 화면상 상담원(우), rxtx=2 → 화면상 고객(좌).
 */
function SttDialogBubble({
  sentence,
  active = false,
  registerRef,
}: {
  sentence: import('../hooks/useTrackingStt').SttSentence;
  active?: boolean;
  registerRef?: (el: HTMLDivElement | null) => void;
}) {
  const rxtx = String(sentence.rxtxKind);
  // 반전: rxtx=2 (원본 상담원) 를 화면상 고객으로 표기 (데이터 변경 X, 표기만 swap)
  const isCustomer = rxtx === '2';
  const isCenter = rxtx === '9';
  const totalSec = Math.floor(sentence.armsoffset / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  const ts = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  const label = isCustomer ? '고객' : isCenter ? '통합' : '상담원';
  const text = sentence.orgSentence || sentence.sentence;
  if (isCenter) {
    return (
      <div ref={registerRef} className="text-center">
        <span
          className={`inline-block text-[11px] rounded-full px-2 py-0.5 transition-all ${
            active ? 'bg-amber-100 text-amber-800 ring-2 ring-amber-400/40' : 'bg-gray-100 text-gray-500'
          }`}
        >
          {ts} · {text}
        </span>
      </div>
    );
  }
  return (
    <div ref={registerRef} className={`flex max-w-[88%] gap-2 ${isCustomer ? '' : 'ml-auto flex-row-reverse'}`}>
      <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${isCustomer ? 'bg-emerald-500/10 text-emerald-600' : 'bg-blue-500/10 text-blue-600'}`}>
        {isCustomer ? <User className="size-3.5" /> : <Headphones className="size-3.5" />}
      </div>
      <div className={`flex flex-col gap-0.5 ${isCustomer ? '' : 'items-end'}`}>
        <div className={`flex items-center gap-1.5 ${isCustomer ? '' : 'flex-row-reverse'}`}>
          <span className={`text-[10px] font-medium ${isCustomer ? 'text-emerald-600/70' : 'text-blue-600/70'}`}>{label}</span>
          <span className="tabular-nums text-[10px] text-slate-500">{ts}</span>
        </div>
        <div
          className={`rounded-2xl px-3 py-1.5 text-[12.5px] leading-relaxed border transition-all ${isCustomer ? 'rounded-tl-md' : 'rounded-tr-md'} ${
            active
              ? isCustomer
                ? 'border-emerald-400 bg-emerald-100 ring-2 ring-emerald-400/40 shadow-sm'
                : 'border-blue-400 bg-blue-100 ring-2 ring-blue-400/40 shadow-sm'
              : isCustomer
                ? 'border-emerald-100 bg-emerald-50'
                : 'border-blue-100 bg-blue-50'
          }`}
        >
          <p className="whitespace-pre-wrap break-words text-slate-700">{text}</p>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[10.5px] text-gray-500 w-14 flex-shrink-0 uppercase tracking-wide">{label}</span>
      <span className={`text-[11.5px] text-gray-700 ${mono ? 'font-mono' : ''} break-all flex-1`}>{value}</span>
    </div>
  );
}

/**
 * STT 변환 섹션 — 변환 이력 셀렉터 + 선택 결과 + 재변환 버튼.
 * 동일 filename 으로 여러 번 변환할 수 있으므로 이력 목록을 시간 역순 노출하고,
 * 사용자가 선택한 ucidGkey 의 문장을 다이얼로그로 표시.
 */
function SttSection({
  blob,
  filename,
  currentPlayTimeSec,
  aoeEnabled,
  onSummarizeClick,
}: {
  blob: Blob;
  filename: string;
  currentPlayTimeSec: number;
  aoeEnabled: boolean;
  onSummarizeClick: (ucidGkey: string, sentences: SttSentence[]) => void;
}) {
  const { result: sttResult, requestStt, reset: resetStt, listByFilename, loadSentences } = useTrackingStt();
  const [history, setHistory] = useState<SttHistoryItem[]>([]);
  const [selectedUcidGkey, setSelectedUcidGkey] = useState<string | null>(null);
  const [sentences, setSentences] = useState<SttSentence[] | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingSentences, setLoadingSentences] = useState(false);
  const bubbleRefs = useRef<Array<HTMLDivElement | null>>([]);

  const refreshHistory = useCallback(
    async (autoSelect?: string) => {
      setLoadingHistory(true);
      try {
        const items = await listByFilename(filename);
        setHistory(items);
        if (autoSelect && items.some((it) => it.ucidGkey === autoSelect)) {
          setSelectedUcidGkey(autoSelect);
          return;
        }
        if (items.length > 0) {
          setSelectedUcidGkey((prev) => (prev && items.some((it) => it.ucidGkey === prev) ? prev : items[0].ucidGkey));
        } else {
          setSelectedUcidGkey(null);
          setSentences(null);
        }
      } finally {
        setLoadingHistory(false);
      }
    },
    [listByFilename, filename],
  );

  // mount / filename 변경 시 history load
  useEffect(() => {
    void refreshHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filename]);

  // 변환 완료 감지 → refresh + 새 ucidGkey 선택 + sttResult 리셋
  useEffect(() => {
    if (sttResult.status === 'done' && sttResult.newUcidGkey) {
      const newKey = sttResult.newUcidGkey;
      void refreshHistory(newKey);
      resetStt();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sttResult.status, sttResult.newUcidGkey]);

  // selectedUcidGkey 변경 시 sentences load
  useEffect(() => {
    if (!selectedUcidGkey) {
      setSentences(null);
      return undefined;
    }
    let cancelled = false;
    setLoadingSentences(true);
    loadSentences(selectedUcidGkey)
      .then((s) => {
        if (!cancelled) setSentences(s);
      })
      .finally(() => {
        if (!cancelled) setLoadingSentences(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedUcidGkey, loadSentences]);

  const inProgress = sttResult.status === 'uploading' || sttResult.status === 'requesting' || sttResult.status === 'transcribing';
  const hasHistory = history.length > 0;

  // 현재 재생 시각에 해당하는 문장 idx — sentences.armsoffset(ms) ≤ currentPlayTimeSec*1000 인 마지막 항목
  const activeIdx = (() => {
    if (!sentences || sentences.length === 0) return -1;
    const currentMs = currentPlayTimeSec * 1000;
    let idx = -1;
    for (let i = 0; i < sentences.length; i++) {
      if ((sentences[i].armsoffset ?? 0) <= currentMs) idx = i;
      else break; // armsoffset 오름차순 가정
    }
    return idx;
  })();

  // activeIdx 변경 시 자동 스크롤 (사용자 수동 스크롤 방해 최소화 — block: nearest)
  useEffect(() => {
    if (activeIdx < 0) return;
    const el = bubbleRefs.current[activeIdx];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeIdx]);

  return (
    <div className="mt-4 rounded-lg border border-cyan-200 bg-cyan-50/40 p-3">
      <div className="flex items-center gap-2 mb-2">
        <FileAudio className="size-4 text-cyan-600" />
        <span className="text-[13px] font-semibold text-gray-800">STT 텍스트 변환</span>
        {hasHistory && <span className="ml-auto text-[10.5px] text-cyan-700 bg-cyan-100 rounded-full px-2 py-0.5 font-medium">이미 변환 {history.length}회</span>}
      </div>

      {/* 변환 이력 셀렉터 — 2건 이상일 때만 노출 */}
      {history.length >= 2 && (
        <div className="mb-3">
          <div className="text-[10.5px] text-gray-500 mb-1 uppercase tracking-wide">변환 이력 선택</div>
          <div className="flex flex-col gap-1 max-h-[140px] overflow-y-auto pr-1">
            {history.map((it) => (
              <button
                key={it.ucidGkey}
                onClick={() => setSelectedUcidGkey(it.ucidGkey)}
                className={`text-left text-[11.5px] px-2.5 py-1.5 rounded border transition-colors ${
                  selectedUcidGkey === it.ucidGkey ? 'border-cyan-500 bg-white shadow-sm' : 'border-gray-200 bg-white/60 hover:border-cyan-300'
                }`}
              >
                <div className="flex items-baseline gap-2">
                  <span className="tabular-nums text-[11px] text-gray-700">{new Date(it.convertedAt).toLocaleString('ko-KR')}</span>
                  <span className="ml-auto text-[10.5px] text-gray-500">{it.sentenceCount}문장</span>
                </div>
                <div className="text-[10px] text-gray-400 font-mono truncate mt-0.5">{it.ucidGkey}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 진행 상태 표시 */}
      {sttResult.status === 'uploading' && (
        <div className="flex items-center gap-2 text-[12px] text-blue-700 mb-2 p-2 rounded bg-blue-50 border border-blue-200">
          <Loader2 className="size-3.5 animate-spin" /> 파일 업로드 중...
        </div>
      )}
      {sttResult.status === 'requesting' && (
        <div className="flex items-center gap-2 text-[12px] text-amber-700 mb-2 p-2 rounded bg-amber-50 border border-amber-200">
          <Loader2 className="size-3.5 animate-spin" /> STT 변환 요청 등록 중...
        </div>
      )}
      {sttResult.status === 'transcribing' && (
        <div className="flex flex-col gap-1 mb-2 p-2 rounded bg-amber-50 border border-amber-200">
          <div className="flex items-center gap-2 text-[12px] text-amber-700">
            <Loader2 className="size-3.5 animate-spin" /> STT 엔진 변환 중...
            <span className="ml-auto text-[11px] text-gray-500 tabular-nums">{sttResult.elapsedSec ?? 0}s 경과</span>
          </div>
          <p className="text-[10.5px] text-gray-500 leading-snug">
            통화 길이에 따라 수초 ~ 수분 소요됩니다. 사이드바를 닫아도 백그라운드에서 계속되며,
            <b className="text-gray-700"> STT &gt; 파일업로드</b> 메뉴에서도 진행 상황을 확인할 수 있습니다.
          </p>
        </div>
      )}
      {sttResult.status === 'error' && (
        <Alert
          type="error"
          showIcon
          icon={<XCircle className="size-4" />}
          message="STT 변환 실패"
          description={sttResult.message ?? '알 수 없는 오류'}
          action={
            <Button size="small" onClick={resetStt}>
              닫기
            </Button>
          }
          className="mb-2"
        />
      )}

      {/* 선택된 변환 결과 다이얼로그 */}
      {selectedUcidGkey &&
        (loadingSentences ? (
          <div className="text-center py-6 text-[12px] text-gray-500">
            <Spin size="small" /> <span className="ml-2">대화 로드 중...</span>
          </div>
        ) : sentences && sentences.length > 0 ? (
          <div className="space-y-1 mb-3">
            <div className="flex items-center gap-2 text-[12px] text-emerald-700">
              <CheckCircle2 className="size-3.5" /> 변환 결과
              <span className="ml-auto text-[11px] text-gray-500">{sentences.length}문장</span>
              {aoeEnabled && selectedUcidGkey && (
                <Button
                  size="small"
                  type="primary"
                  icon={<Sparkles className="size-3" />}
                  className="!h-6 !px-2 !text-[10.5px]"
                  onClick={() => onSummarizeClick(selectedUcidGkey, sentences)}
                >
                  대화 요약
                </Button>
              )}
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-3 max-h-[420px] overflow-y-auto space-y-2">
              {sentences.map((s, idx) => (
                <SttDialogBubble
                  key={`${s.armsoffset}-${idx}`}
                  sentence={s}
                  active={idx === activeIdx}
                  registerRef={(el) => {
                    bubbleRefs.current[idx] = el;
                  }}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-[11px] text-gray-500 py-3 text-center">선택된 변환 결과에 문장이 없습니다.</div>
        ))}

      {!hasHistory && !inProgress && !loadingHistory && sttResult.status !== 'error' && (
        <p className="text-[11px] text-gray-500 mb-2 leading-relaxed">
          아직 변환된 결과가 없습니다. 변환 요청 시 STT 엔진으로 전송되며,
          <b className="text-gray-700"> STT &gt; 파일업로드</b> 메뉴에서도 변환 결과를 확인할 수 있습니다.
        </p>
      )}

      {/* 변환 요청 버튼 — 항상 노출, 진행중에만 disable */}
      <Button
        type={hasHistory ? 'default' : 'primary'}
        block
        icon={<FileAudio className="size-3.5" />}
        loading={inProgress}
        disabled={inProgress || loadingHistory}
        onClick={() => requestStt(blob, filename)}
      >
        {inProgress ? '진행 중...' : hasHistory ? '재변환 요청' : 'STT 변환 요청'}
      </Button>
      {hasHistory && !inProgress && <p className="text-[10.5px] text-gray-500 mt-1.5 leading-snug">※ 재변환 시 새 변환 결과가 별도 항목으로 추가됩니다.</p>}
    </div>
  );
}
