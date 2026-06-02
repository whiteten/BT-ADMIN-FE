/**
 * 교환기 멘트 등록/수정 드로어 (SWAT IPR20S1070).
 *
 * 등록: 단일 / 다량 세그먼트.
 *  - 단일: 멘트명(중복불가) + 설명 + 업로드일자 + PCM 파일.
 *  - 다량: PCM 다중 선택(파일명=멘트명 자동) + 항목별 설명.
 * 수정: 단일 강제. 현재 파일 재생/다운로드/교체.
 *
 * 노드/테넌트는 현재 컨텍스트(목록 선택) 고정(disabled). 경로는 테넌트 기준 자동 산출(공통=0000).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, DatePicker, Drawer, Form, Input } from 'antd';
import dayjs from 'dayjs';
import { Download, Play, Trash2, Upload } from 'lucide-react';
import { toast } from '@/shared-util';
import { useCreateMent, useUpdateMent } from '../hooks/useMentQueries';
import type { MentBatchItem, MentResponse } from '../types';

type Mode = 'create' | 'edit';

export type MentDrawerState =
  | { open: false }
  | { open: true; mode: Mode; row?: MentResponse; nodeId: number | null; nodeName: string | null; tenantId: number | null; tenantName: string | null };

interface Props {
  state: MentDrawerState;
  onClose: () => void;
}

interface SingleFormValues {
  mentName?: string;
  mentDesc?: string;
  createDate?: dayjs.Dayjs;
}

/** 멘트 파일명 규칙: 영문/숫자/_/. 만, 64자 이내 (SWAT). */
const FILE_NAME_RE = /^[A-Za-z0-9_.]{1,64}$/;

/** 테넌트 기준 경로 산출 (공통=0000). */
function mentPath(tenantId: number | null): string {
  const seg = tenantId == null || tenantId === 0 ? '0000' : String(tenantId).padStart(4, '0');
  return `ms/prompt/${seg}/`;
}

export default function MentFormDrawer({ state, onClose }: Props) {
  const [form] = Form.useForm<SingleFormValues>();
  const [regMode, setRegMode] = useState<'single' | 'multi'>('single');

  // 단일: 선택/교체 파일
  const [singleFile, setSingleFile] = useState<File | null>(null);
  const singleInputRef = useRef<HTMLInputElement>(null);
  // 다량: 파일+설명 목록
  const [multiItems, setMultiItems] = useState<MentBatchItem[]>([]);
  const multiInputRef = useRef<HTMLInputElement>(null);

  const isEdit = state.open && state.mode === 'edit';
  const nodeId = state.open ? state.nodeId : null;
  const tenantId = state.open ? (isEdit && state.row ? state.row.tenantId : state.tenantId) : null;
  const tenantName = state.open ? (isEdit && state.row ? state.row.tenantName : state.tenantName) : null;
  const nodeName = state.open ? state.nodeName : null;

  const path = useMemo(() => mentPath(tenantId), [tenantId]);

  // ─── 초기화 ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!state.open) {
      form.resetFields();
      setSingleFile(null);
      setMultiItems([]);
      setRegMode('single');
      return;
    }
    setRegMode('single');
    setSingleFile(null);
    setMultiItems([]);
    if (state.mode === 'edit' && state.row) {
      const r = state.row;
      form.setFieldsValue({
        mentName: r.mentName ?? '',
        mentDesc: r.mentDesc ?? '',
        createDate: r.createDate ? dayjs(r.createDate, 'YYYYMMDD') : dayjs(),
      });
    } else {
      form.setFieldsValue({ mentName: '', mentDesc: '', createDate: dayjs() });
    }
  }, [state, form]);

  const { mutate: create, isPending: creating } = useCreateMent({
    mutationOptions: {
      onSuccess: () => {
        toast.success('멘트가 등록되었습니다');
        onClose();
      },
      onError: (err: unknown) => toast.error(extractMessage(err) ?? '등록 실패'),
    },
  });
  const { mutate: update, isPending: updating } = useUpdateMent({
    mutationOptions: {
      onSuccess: () => {
        toast.success('멘트가 수정되었습니다');
        onClose();
      },
      onError: (err: unknown) => toast.error(extractMessage(err) ?? '수정 실패'),
    },
  });
  const submitting = creating || updating;

  // ─── 파일 선택 ───────────────────────────────────────────────────────────────
  const onPickSingle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!FILE_NAME_RE.test(file.name)) {
      toast.error('파일명은 영문/숫자/_/. 만, 64자 이내여야 합니다');
      return;
    }
    setSingleFile(file);
  };

  const onPickMulti = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    const valid = files.filter((f) => FILE_NAME_RE.test(f.name));
    const rejected = files.length - valid.length;
    if (rejected > 0) toast.warning(`${rejected}개 파일이 파일명 규칙 위반으로 제외되었습니다`);
    setMultiItems((prev) => [...prev, ...valid.map((f) => ({ file: f, mentDesc: '' }))]);
  };

  // ─── 저장 ────────────────────────────────────────────────────────────────────
  const onSubmit = async () => {
    if (!state.open) return;
    if (nodeId == null || tenantId == null) {
      toast.warning('노드와 테넌트가 필요합니다');
      return;
    }

    // ─ 다량 등록 — 미시드(ipron-ment-create-batch), 추후 제공 ─
    if (!isEdit && regMode === 'multi') {
      toast.info('다량 등록은 추후 제공 예정입니다');
      return;
    }

    // ─ 단일 등록 / 수정 ─
    try {
      const values = await form.validateFields();
      const mentName = values.mentName!.trim();
      const createDate = values.createDate ? values.createDate.format('YYYYMMDD') : undefined;

      if (isEdit && state.row) {
        update({
          mentId: state.row.ieMentId,
          body: {
            mentName,
            filePath: singleFile ? singleFile.name : (state.row.filePath ?? ''),
            mentDesc: values.mentDesc,
            createDate,
          },
        });
      } else {
        // 등록: 파일 선택 필수 (BE filePath non-empty 검증)
        if (!singleFile) {
          toast.error('멘트 PCM 파일을 선택하세요');
          return;
        }
        create({
          nodeId,
          tenantId,
          mentName,
          filePath: singleFile.name,
          mentDesc: values.mentDesc,
          createDate,
        });
      }
    } catch {
      // antd validation inline
    }
  };

  return (
    <Drawer
      title={isEdit ? '교환기 멘트 수정' : '교환기 멘트 등록'}
      width={560}
      open={state.open}
      onClose={onClose}
      forceRender
      extra={
        <div className="flex gap-2">
          <Button onClick={onClose}>취소</Button>
          <Button type="primary" loading={submitting} onClick={onSubmit}>
            저장
          </Button>
        </div>
      }
    >
      {/* 등록 방식 세그먼트 (수정 시 숨김) */}
      {!isEdit && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[12px] text-gray-500 mr-1">등록 방식</span>
          <Button size="small" type={regMode === 'single' ? 'primary' : 'default'} onClick={() => setRegMode('single')}>
            단일 등록
          </Button>
          <Button size="small" type={regMode === 'multi' ? 'primary' : 'default'} onClick={() => setRegMode('multi')}>
            다량 등록
          </Button>
        </div>
      )}

      {/* 공통: 노드/테넌트 (현재 컨텍스트 고정) */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-4">
        <div>
          <label className="block text-[12px] font-semibold text-gray-600 mb-1">노드명</label>
          <Input value={nodeName ?? (nodeId != null ? `노드 ${nodeId}` : '-')} disabled />
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-gray-600 mb-1">테넌트명</label>
          <Input value={tenantId === 0 ? '공통' : (tenantName ?? (tenantId != null ? `테넌트 ${tenantId}` : '-'))} disabled />
        </div>
      </div>

      {/* ===== 단일 등록 / 수정 ===== */}
      {/* Form 은 항상 마운트 유지 (useForm 인스턴스와 연결 유지 — 조건부 마운트 시 경고 방지) */}
      <Form form={form} layout="vertical" style={{ display: isEdit || regMode === 'single' ? undefined : 'none' }}>
        <Form.Item label="멘트명" name="mentName" rules={[{ required: true, max: 128, message: '1~128자 필수' }]} extra="노드+테넌트 내 멘트명 중복 불가">
          <Input maxLength={128} placeholder="1~128자" />
        </Form.Item>

        <Form.Item label="경로">
          <Input value={path} disabled />
        </Form.Item>

        <Form.Item label="멘트 파일 (.pcm)" required={!isEdit}>
          {/* 실제 음성파일 업로드는 추후(Phase 1 deferred — MS 동기화 미구현). 파일 선택 시 파일명만 filePath 로 캡처. */}
          <input ref={singleInputRef} type="file" accept=".pcm" className="hidden" onChange={onPickSingle} />
          {/* 신규/교체 선택된 파일 */}
          {singleFile ? (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-[12.5px] font-mono text-gray-700 flex-1 truncate">{singleFile.name}</span>
              <span className="text-[11px] text-gray-400">{(singleFile.size / 1024).toFixed(0)} KB</span>
              <Button size="small" type="text" icon={<Trash2 className="size-3.5 text-red-500" />} onClick={() => setSingleFile(null)} />
            </div>
          ) : isEdit && state.open && state.row ? (
            /* 수정: 현재 파일 박스 — 미리듣기/다운로드는 추후(ipron-ment-preview/download 미시드) */
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
              <button
                type="button"
                title="미리듣기 추후 제공"
                onClick={() => toast.info('미리듣기는 추후 제공 예정입니다')}
                className="inline-flex items-center justify-center w-[26px] h-[26px] rounded-full border border-gray-300 text-gray-400 cursor-not-allowed opacity-50"
              >
                <Play className="size-3 fill-current" />
              </button>
              <span className="text-[12.5px] font-mono text-gray-700 flex-1 truncate">{state.row.fileName ?? '-'}</span>
              <Button size="small" icon={<Download className="size-3.5" />} disabled title="다운로드 추후 제공">
                다운로드
              </Button>
              <Button size="small" onClick={() => singleInputRef.current?.click()}>
                파일 교체
              </Button>
            </div>
          ) : (
            /* 신규: 드롭존 (파일 선택 필수 — filePath non-empty 필수) */
            <button
              type="button"
              onClick={() => singleInputRef.current?.click()}
              className="w-full border border-dashed border-gray-300 rounded-lg py-4 text-center hover:border-[#405189] hover:bg-blue-50/40 transition-colors"
            >
              <Upload className="size-5 mx-auto mb-1.5 text-gray-400" />
              <div className="text-[12.5px] text-gray-600">PCM 파일을 클릭하여 선택 (필수)</div>
              <div className="text-[11px] text-gray-400 mt-1">A-LAW 8kHz PCM · 파일명 영문/숫자/_/. 만, 64자 이내 · 실제 업로드는 추후</div>
            </button>
          )}
        </Form.Item>

        <Form.Item label="업로드일자" name="createDate">
          <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
        </Form.Item>

        <Form.Item label="설명" name="mentDesc" rules={[{ max: 256 }]}>
          <Input.TextArea rows={4} maxLength={256} placeholder="256자 이내" />
        </Form.Item>
      </Form>

      {/* ===== 다량 등록 ===== */}
      {!isEdit && regMode === 'multi' && (
        <div className="space-y-4">
          <div>
            <label className="block text-[12px] font-semibold text-gray-600 mb-1">멘트 파일 (.pcm 다중 선택)</label>
            <input ref={multiInputRef} type="file" accept=".pcm" multiple className="hidden" onChange={onPickMulti} />
            <button
              type="button"
              onClick={() => multiInputRef.current?.click()}
              className="w-full border border-dashed border-gray-300 rounded-lg py-4 text-center hover:border-[#405189] hover:bg-blue-50/40 transition-colors"
            >
              <Upload className="size-5 mx-auto mb-1.5 text-gray-400" />
              <div className="text-[12.5px] text-gray-600">여러 PCM 파일을 선택 (멘트명 = 파일명 자동)</div>
              <div className="text-[11px] text-gray-400 mt-1">잘못된 파일명(특수문자/64자 초과)은 자동 제외</div>
            </button>
          </div>

          {multiItems.length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="grid grid-cols-[1fr_80px_1fr_32px] bg-gray-50 px-3 py-2 text-[11.5px] font-semibold text-gray-500 border-b border-gray-200">
                <span>파일명(=멘트명)</span>
                <span className="text-right">크기</span>
                <span>설명</span>
                <span />
              </div>
              <div className="max-h-[320px] overflow-y-auto">
                {multiItems.map((item, idx) => (
                  <div key={`${item.file.name}-${idx}`} className="grid grid-cols-[1fr_80px_1fr_32px] items-center px-3 py-1.5 border-b border-gray-100 text-[12px]">
                    <span className="font-mono text-gray-700 truncate" title={item.file.name}>
                      {item.file.name}
                    </span>
                    <span className="text-right text-gray-400">{(item.file.size / 1024).toFixed(0)} KB</span>
                    <Input
                      size="small"
                      placeholder="설명"
                      value={item.mentDesc}
                      onChange={(e) => {
                        const v = e.target.value;
                        setMultiItems((prev) => prev.map((it, i) => (i === idx ? { ...it, mentDesc: v } : it)));
                      }}
                    />
                    <button type="button" className="text-red-500 hover:text-red-600" onClick={() => setMultiItems((prev) => prev.filter((_, i) => i !== idx))}>
                      <Trash2 className="size-3.5 mx-auto" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}

function extractMessage(err: unknown): string | undefined {
  const e = err as { response?: { data?: { message?: string } } };
  return e?.response?.data?.message;
}
