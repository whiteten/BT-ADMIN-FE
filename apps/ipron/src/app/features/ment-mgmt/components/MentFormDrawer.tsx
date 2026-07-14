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
import { Button, DatePicker, Drawer, Form, Input, Modal, Select } from 'antd';
import dayjs from 'dayjs';
import { Download, Pause, Play, Trash2, Upload } from 'lucide-react';
import { toast } from '@/shared-util';
import { mentApi } from '../api/mentApi';
import { useCreateMent, useCreateMentBatch, useUpdateMent } from '../hooks/useMentQueries';
import type { MentBatchItem, MentResponse } from '../types';

type Mode = 'create' | 'edit';

interface NodeOption {
  nodeId: number;
  nodeName: string;
}

export type MentDrawerState =
  | { open: false }
  | {
      open: true;
      mode: Mode;
      row?: MentResponse;
      nodeId: number | null;
      nodeName: string | null;
      tenantId: number | null;
      tenantName: string | null;
      /** 노드 미선택(전체)으로 등록할 때 드로어 안에서 노드를 고르기 위한 후보 목록 */
      nodeOptions?: NodeOption[];
    };

interface Props {
  state: MentDrawerState;
  onClose: () => void;
}

interface SingleFormValues {
  mentName?: string;
  mentDesc?: string;
  createDate?: dayjs.Dayjs;
}

/** 멘트 파일명 규칙(BE 캐논 통일): 영숫자·_·.·- 만(64자 이내), .pcm 확장자 필수. 대소문자 무관. */
const FILE_NAME_RE = /^[A-Za-z0-9_.-]{1,64}\.pcm$/i;

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
  const nodeOptions = state.open ? (state.nodeOptions ?? []) : [];

  // 노드 미선택(전체) + 신규 등록 → 드로어 안에서 노드 선택
  const [nodeSel, setNodeSel] = useState<number | null>(null);
  const isNodeSelectable = state.open && !isEdit && nodeId == null && nodeOptions.length > 0;
  const effectiveNodeId = nodeId ?? nodeSel;

  const path = useMemo(() => mentPath(tenantId), [tenantId]);

  // ─── 초기화 ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!state.open) {
      form.resetFields();
      setSingleFile(null);
      setMultiItems([]);
      setRegMode('single');
      setNodeSel(null);
      return;
    }
    setRegMode('single');
    setSingleFile(null);
    setMultiItems([]);
    setNodeSel(null);
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

  // 메타 저장 성공 후 PCM 바이트를 별도 업로드(있을 때). 실패해도 메타는 유지됨.
  const uploadBytesIfPresent = async (ieMentId: number, file: File | null) => {
    if (!file) return;
    try {
      await mentApi.uploadFile(ieMentId, file);
    } catch (err: unknown) {
      toast.warning(`메타는 저장되었으나 파일 업로드에 실패했습니다: ${extractMessage(err) ?? ''}`);
    }
  };

  const { mutate: create, isPending: creating } = useCreateMent({
    mutationOptions: {
      onSuccess: async (res) => {
        await uploadBytesIfPresent(res.ieMentId, singleFile);
        toast.success('멘트가 등록되었습니다');
        onClose();
      },
      onError: (err: unknown) => toast.error(extractMessage(err) ?? '등록 실패'),
    },
  });
  const { mutate: update, isPending: updating } = useUpdateMent({
    mutationOptions: {
      onSuccess: async (res) => {
        await uploadBytesIfPresent(res.ieMentId, singleFile);
        toast.success('멘트가 수정되었습니다');
        onClose();
      },
      onError: (err: unknown) => toast.error(extractMessage(err) ?? '수정 실패'),
    },
  });
  const { mutate: createBatch, isPending: batchCreating } = useCreateMentBatch({
    mutationOptions: {
      onSuccess: (rows) => {
        toast.success(`${rows.length}건의 멘트가 등록되었습니다`);
        onClose();
      },
      onError: (err: unknown) => toast.error(extractMessage(err) ?? '다량 등록 실패'),
    },
  });
  const submitting = creating || updating || batchCreating;

  // ─── Template 다운로드 (다량 등록 — SWAT doTemplateDown 정합) ─────────────────
  /**
   * 멘트 목록 가져오기 템플릿 CSV 다운로드.
   * SWAT: fileDown.do?requestedFile=IE_MentList_Import.xlsx (파일명/설명 컬럼).
   * BT-ADMIN: FE에서 동일 컬럼 구조의 CSV 생성 후 다운로드 (SheetJS 미사용).
   */
  const onDownloadTemplate = () => {
    const header = 'mentFile,mentDesc';
    const sample = 'example_ment.pcm,설명 예시';
    const csvContent = `${header}\n${sample}\n`;
    const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'IE_MentList_Import_Template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── 현재 파일 미리듣기/다운로드 (수정 모드) ──────────────────────────────────
  const [previewing, setPreviewing] = useState(false);
  const editAudioRef = useRef<HTMLAudioElement | null>(null);
  const editAudioUrlRef = useRef<string | null>(null);

  const stopEditPreview = () => {
    if (editAudioRef.current) {
      editAudioRef.current.pause();
      editAudioRef.current = null;
    }
    if (editAudioUrlRef.current) {
      URL.revokeObjectURL(editAudioUrlRef.current);
      editAudioUrlRef.current = null;
    }
    setPreviewing(false);
  };

  // 드로어 닫힘/언마운트 시 재생 정리
  useEffect(() => {
    if (!state.open) stopEditPreview();
    return () => stopEditPreview();
  }, [state.open]);

  const onPreviewCurrent = async (mentId: number) => {
    if (previewing) {
      stopEditPreview();
      return;
    }
    try {
      // 파일 없음은 에러가 아닌 소프트조건 → 재생 전 사전체크.
      const check = await mentApi.previewCheck(mentId);
      if (!check.fileExists) {
        toast.warning(check.message ?? '멘트 파일이 없습니다 (미업로드)');
        return;
      }
      const blob = await mentApi.preview(mentId);
      const url = URL.createObjectURL(blob);
      editAudioUrlRef.current = url;
      const audio = new Audio(url);
      editAudioRef.current = audio;
      audio.onended = () => stopEditPreview();
      audio.onerror = () => {
        toast.error('재생에 실패했습니다');
        stopEditPreview();
      };
      setPreviewing(true);
      await audio.play();
    } catch (err: unknown) {
      toast.error(extractMessage(err) ?? '미리듣기 실패');
      stopEditPreview();
    }
  };

  const onDownloadCurrent = async (mentId: number, fileName: string) => {
    try {
      // 파일 없음은 BE 404 → BFF 500 둔갑 → 사전체크(항상 200)로 회피. 실체 없으면 graceful 안내 후 중단.
      const check = await mentApi.previewCheck(mentId);
      if (!check.fileExists) {
        toast.warning(check.message ?? '멘트 파일 실체가 없습니다(메타만 등록됨)');
        return;
      }
      const blob = await mentApi.download(mentId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      toast.error(status === 404 ? '서버에 등록된 멘트 파일이 존재하지 않습니다.' : (extractMessage(err) ?? '다운로드 실패'));
    }
  };

  // ─── 파일 선택 ───────────────────────────────────────────────────────────────
  const onPickSingle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!FILE_NAME_RE.test(file.name)) {
      toast.error('파일명은 영문/숫자/_/-/. 만 가능하며 .pcm 확장자여야 합니다(64자 이내)');
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
    if (effectiveNodeId == null || tenantId == null) {
      toast.warning(isNodeSelectable ? '노드를 선택하세요' : '노드와 테넌트가 필요합니다');
      return;
    }

    // ─ 다량 등록 — multipart files[] + mentDescs[] (파일명=멘트명) ─
    if (!isEdit && regMode === 'multi') {
      if (multiItems.length === 0) {
        toast.warning('PCM 파일을 1개 이상 선택하세요');
        return;
      }
      createBatch({ nodeId: effectiveNodeId, tenantId, items: multiItems });
      return;
    }

    // ─ 단일 등록 / 수정 ─
    try {
      const values = await form.validateFields();
      const mentName = values.mentName!.trim();
      const createDate = values.createDate ? values.createDate.format('YYYYMMDD') : undefined;

      if (isEdit && state.row) {
        // 수정: 중복체크 사전 호출 (SWAT dupCallProcessForUpdate 정합)
        const isDup = await mentApi.duplicateCheck({
          nodeId: effectiveNodeId,
          tenantId,
          mentName,
          excludeMentId: state.row.ieMentId,
        });
        if (isDup) {
          Modal.confirm({
            title: '멘트명 중복',
            content: `동일 노드·테넌트 내 "${mentName}" 멘트명이 이미 존재합니다. 계속 저장하시겠습니까?`,
            okText: '저장',
            cancelText: '취소',
            onOk: () =>
              update({
                mentId: state.row!.ieMentId,
                body: {
                  mentName,
                  filePath: singleFile ? singleFile.name : (state.row!.filePath ?? ''),
                  mentDesc: values.mentDesc,
                  createDate,
                },
              }),
          });
          return;
        }
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
        // 등록: 중복체크 사전 호출 (SWAT dupCallProcess 정합)
        const isDup = await mentApi.duplicateCheck({ nodeId: effectiveNodeId, tenantId, mentName });
        if (isDup) {
          Modal.confirm({
            title: '멘트명 중복',
            content: `동일 노드·테넌트 내 "${mentName}" 멘트명이 이미 존재합니다. 계속 저장하시겠습니까?`,
            okText: '저장',
            cancelText: '취소',
            onOk: () =>
              create({
                nodeId: effectiveNodeId,
                tenantId,
                mentName,
                filePath: singleFile!.name,
                mentDesc: values.mentDesc,
                createDate,
              }),
          });
          return;
        }
        create({
          nodeId: effectiveNodeId,
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
      closable={{ placement: 'end' }}
      width={560}
      open={state.open}
      onClose={onClose}
      forceRender
      footer={
        <div className="flex items-center justify-end gap-2">
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
          {isNodeSelectable ? (
            <Select
              className="w-full"
              placeholder="노드를 선택하세요"
              value={nodeSel ?? undefined}
              onChange={setNodeSel}
              options={nodeOptions.map((n) => ({ label: n.nodeName, value: n.nodeId }))}
              showSearch
              optionFilterProp="label"
            />
          ) : (
            <Input value={nodeName ?? (nodeId != null ? `노드 ${nodeId}` : '-')} disabled />
          )}
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
          {/* 파일 선택 시 메타 저장 후 PCM 바이트를 로컬 스토리지에 업로드. MS 송신(동기화)은 별도 미연동. */}
          <input ref={singleInputRef} type="file" accept=".pcm" className="hidden" style={{ display: 'none' }} onChange={onPickSingle} />
          {/* 신규/교체 선택된 파일 */}
          {singleFile ? (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-[12.5px] font-mono text-gray-700 flex-1 truncate">{singleFile.name}</span>
              <span className="text-[11px] text-gray-400">{(singleFile.size / 1024).toFixed(0)} KB</span>
              <Button size="small" type="text" icon={<Trash2 className="size-3.5 text-red-500" />} onClick={() => setSingleFile(null)} />
            </div>
          ) : isEdit && state.open && state.row ? (
            /* 수정: 현재 파일 박스 — 미리듣기(PCM→WAV) / 다운로드 / 교체 */
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
              <button
                type="button"
                title={previewing ? '정지' : '미리듣기 (PCM→WAV)'}
                onClick={() => onPreviewCurrent(state.row!.ieMentId)}
                className={`inline-flex items-center justify-center w-[26px] h-[26px] rounded-full border transition-colors ${
                  previewing ? 'bg-[#405189] border-[#405189] text-white' : 'border-gray-300 text-[#405189] hover:border-[#405189] hover:bg-blue-50'
                }`}
              >
                {previewing ? <Pause className="size-3" /> : <Play className="size-3 fill-current" />}
              </button>
              <span className="text-[12.5px] font-mono text-gray-700 flex-1 truncate">{state.row.filePath ?? state.row.fileName ?? '-'}</span>
              <Button
                size="small"
                icon={<Download className="size-3.5" />}
                onClick={() => onDownloadCurrent(state.row!.ieMentId, state.row!.filePath ?? state.row!.fileName ?? 'ment.pcm')}
                title="원본 PCM 다운로드"
              >
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
              <div className="text-[11px] text-gray-400 mt-1">A-LAW 8kHz PCM · 파일명 영문/숫자/_/-/. 만, 64자 이내 · .pcm 확장자 필수</div>
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
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[12px] font-semibold text-gray-600">멘트 파일 (.pcm 다중 선택)</label>
              {/* 템플릿 다운로드 (파일명/설명 컬럼 CSV) */}
              <Button size="small" icon={<Download className="size-3" />} onClick={onDownloadTemplate} title="멘트 목록 가져오기 템플릿 다운로드">
                템플릿 다운로드
              </Button>
            </div>
            <input ref={multiInputRef} type="file" accept=".pcm" multiple className="hidden" style={{ display: 'none' }} onChange={onPickMulti} />
            <button
              type="button"
              onClick={() => multiInputRef.current?.click()}
              className="w-full border border-dashed border-gray-300 rounded-lg py-4 text-center hover:border-[#405189] hover:bg-blue-50/40 transition-colors"
            >
              <Upload className="size-5 mx-auto mb-1.5 text-gray-400" />
              <div className="text-[12.5px] text-gray-600">여러 PCM 파일을 선택 (멘트명 = 파일명 자동)</div>
              <div className="text-[11px] text-gray-400 mt-1">잘못된 파일명(특수문자/64자 초과/.pcm 아님)은 자동 제외</div>
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
