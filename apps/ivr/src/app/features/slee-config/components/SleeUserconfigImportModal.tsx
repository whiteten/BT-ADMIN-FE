/**
 * SLEE 환경변수 cfg 파일 다중 Import Drawer — AS-IS IPR20S6060MFU 동등.
 *
 * <p>여러 cfg 파일을 한 번에 업로드 → 파일별 [section] key=value;desc 파싱 →
 * TB_IR_SLEE_USERCONFIG 등록. 파일 단위 트랜잭션 격리(BE REQUIRES_NEW)로
 * 한 파일 실패가 다른 파일 영향 X.</p>
 *
 * <p>Import 는 DB 등록 단계 — 장비 적용은 별도 적용 기능에서 수행.</p>
 *
 * <p>시각 패턴: 시나리오 배포 사이드바 / 멘트파일 적용 Drawer 통일 — placement="right" width=480.</p>
 */
import { forwardRef, useImperativeHandle, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Drawer, Upload, type UploadFile } from 'antd';
import { CheckCircle, FileText, Upload as UploadIcon, XCircle } from 'lucide-react';
import { toast } from '@/shared-util';
import { sleeConfigQueryKeys, useImportUserconfig } from '../hooks/useSleeConfigQueries';
import type { SleeUserconfigImportFileResult, SleeUserconfigImportResponse } from '../types';

export interface SleeUserconfigImportModalRef {
  /** tenantId 를 받아 Drawer 열기 */
  open: (tenantId: number) => void;
  close: () => void;
}

// 사전 검증 — AS-IS checkFile() (tools.js:8775) 동등. BE 에도 동일 정책 적용됨.
const ALLOWED_EXTENSIONS = ['cfg', 'ini', 'inf', 'dat', 'idx'];
const ACCEPT = '.cfg,.ini,.inf,.dat,.idx';
const MAX_FILENAME_LENGTH = 100; // DB CONFIG_FILE 컬럼 length(100)
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

/**
 * 파일 사전 유효성 검사. 통과 시 null, 실패 시 사유 메시지.
 * BE 에서도 같은 정책을 강제 — 우회 차단.
 */
function validateClientSide(file: File): string | null {
  if (!file.name?.trim()) return '파일명이 비어있습니다.';
  if (file.name.length > MAX_FILENAME_LENGTH) {
    return `파일명이 너무 깁니다 (${file.name.length}자 > ${MAX_FILENAME_LENGTH}자 한도)`;
  }
  if (file.size <= 0) return '빈 파일입니다.';
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `파일 크기가 한도(10MB)를 초과했습니다: ${(file.size / 1024 / 1024).toFixed(2)}MB`;
  }
  const dot = file.name.lastIndexOf('.');
  const ext = dot < 0 ? '' : file.name.substring(dot + 1).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return `허용되지 않은 확장자입니다 (허용: ${ALLOWED_EXTENSIONS.join(', ')})`;
  }
  return null;
}

const SleeUserconfigImportModal = forwardRef<SleeUserconfigImportModalRef>((_, ref) => {
  const queryClient = useQueryClient();
  const [visible, setVisible] = useState(false);
  const [tenantId, setTenantId] = useState<number | null>(null);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [result, setResult] = useState<SleeUserconfigImportResponse | null>(null);

  const { mutate: importMutate, isPending } = useImportUserconfig({
    mutationOptions: {
      onSuccess: (data) => {
        setResult(data);
        // 등록 결과 화면(목록/카테고리/속성) 즉시 갱신.
        queryClient.invalidateQueries({ queryKey: sleeConfigQueryKeys.getConfigFiles._def });
        queryClient.invalidateQueries({ queryKey: sleeConfigQueryKeys.getCategories._def });
        queryClient.invalidateQueries({ queryKey: sleeConfigQueryKeys.getProperties._def });

        if (data.failCount === 0) {
          toast.success(`${data.successCount}개 파일 Import 성공 (총 ${data.totalUpsertedRows}개 항목 저장)`);
        } else if (data.successCount === 0) {
          toast.error(`Import 실패 — 모든 ${data.failCount}개 파일이 실패했습니다.`);
        } else {
          toast.warning(`Import 결과: 성공 ${data.successCount} / 실패 ${data.failCount}`);
        }
      },
      onError: (err) => toast.error(`Import 실패: ${(err as Error).message ?? '알 수 없는 오류'}`),
    },
  });

  useImperativeHandle(ref, () => ({
    open: (tid: number) => {
      setTenantId(tid);
      setFiles([]);
      setResult(null);
      setVisible(true);
    },
    close: () => setVisible(false),
  }));

  const handleSubmit = () => {
    if (tenantId == null || files.length === 0) return;
    const fileObjs = files.map((f) => f.originFileObj as File).filter(Boolean);
    if (fileObjs.length === 0) return;
    importMutate({ params: { tenantId }, files: fileObjs });
  };

  return (
    <Drawer
      title="환경변수 cfg 파일 Import"
      placement="right"
      width={480}
      open={visible}
      onClose={() => setVisible(false)}
      destroyOnClose
      footer={
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">{result ? `완료 — 성공 ${result.successCount} / 실패 ${result.failCount}` : `선택 파일: ${files.length}개`}</span>
          <div className="flex gap-2">
            <Button onClick={() => setVisible(false)}>{result ? '닫기' : '취소'}</Button>
            {!result && (
              <Button type="primary" loading={isPending} disabled={files.length === 0} onClick={handleSubmit}>
                Import 실행
              </Button>
            )}
          </div>
        </div>
      }
    >
      {!result ? (
        <div className="flex flex-col gap-4">
          {/* 안내 메타 카드 */}
          <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
            <div className="text-[11px] text-slate-500 mb-0.5">Import 규칙</div>
            <ul className="text-[12px] text-slate-700 leading-5 list-disc list-inside space-y-0.5">
              <li>
                <b>[section] key=value;설명</b> 형식의 cfg 파일을 여러 개 선택 가능
              </li>
              <li>
                허용 확장자: <b>{ALLOWED_EXTENSIONS.join(', ')}</b> · 파일당 최대 10MB
              </li>
              <li>같은 테넌트에 이미 등록된 파일명은 차단</li>
              <li>일부 실패해도 성공한 파일은 등록됨 (장비 적용은 별도)</li>
            </ul>
          </div>

          {/* 파일 업로드 영역 */}
          <div>
            <div className="text-[12px] font-semibold text-slate-700 mb-2">파일 선택</div>
            <Upload
              accept={ACCEPT}
              multiple
              // beforeUpload 에서 false 를 반환해 자동 업로드 차단 + 사전 유효성 검증.
              // 검증 실패 파일은 fileList 에 추가하지 않음 — UX 즉시 차단.
              beforeUpload={(file) => {
                const err = validateClientSide(file);
                if (err) {
                  toast.error(`${file.name}: ${err}`);
                  return Upload.LIST_IGNORE;
                }
                return false;
              }}
              fileList={files}
              onChange={(info) => setFiles(info.fileList)}
            >
              <Button icon={<UploadIcon className="size-3.5" />}>cfg 파일 선택</Button>
            </Upload>
          </div>
        </div>
      ) : (
        /* ===== Import 결과 ===== */
        <div className="flex flex-col gap-4">
          {/* 결과 요약 카드 */}
          <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
            <div className="text-[11px] text-slate-500 mb-0.5">Import 결과</div>
            <div className="text-[13px] text-slate-800">
              전체 <b>{result.totalFiles}</b> · 성공 <b className="text-green-600">{result.successCount}</b> · 실패 <b className="text-red-600">{result.failCount}</b>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              총 저장 행: <b>{result.totalUpsertedRows}</b>
            </div>
          </div>

          {/* 파일별 결과 카드 리스트 */}
          <div>
            <div className="text-[12px] font-semibold text-slate-700 mb-2">파일별 결과 ({result.fileResults.length})</div>
            <div className="space-y-2">
              {result.fileResults.map((r: SleeUserconfigImportFileResult) => (
                <div key={r.configFile} className={`flex items-start gap-2 p-2.5 rounded-md border ${r.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                  {r.success ? <CheckCircle className="size-4 text-green-600 flex-shrink-0 mt-0.5" /> : <XCircle className="size-4 text-red-600 flex-shrink-0 mt-0.5" />}
                  <FileText className="size-3.5 text-slate-400 flex-shrink-0 mt-1" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium text-slate-800 truncate">{r.configFile}</div>
                    {r.success ? (
                      <div className="text-[10px] text-slate-500 truncate">
                        섹션 {r.parsedCategories} · 속성 {r.parsedProperties} · 저장 {r.upsertedRows}
                        {r.detectedEncoding && ` · ${r.detectedEncoding}`}
                      </div>
                    ) : (
                      <div className="text-[10px] text-red-600 truncate">{r.errorMessage ?? '실패'}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
});

SleeUserconfigImportModal.displayName = 'SleeUserconfigImportModal';
export default SleeUserconfigImportModal;
