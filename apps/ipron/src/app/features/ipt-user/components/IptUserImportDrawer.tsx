/**
 * IPT 사용자 엑셀 가져오기 Drawer (AS-IS IPR20S2055_Import 개선).
 *
 * 레거시(FE 행 반복 호출) → TO-BE 서버 일괄 처리 + 행별 성공/실패 결과 (부분 성공 207).
 * 단계: 템플릿 다운로드 → 파일 선택 → 가져오기 → 결과 표.
 */
import { useState } from 'react';
import { Alert, Button, Drawer, Upload } from 'antd';
import { Download, FileSpreadsheet } from 'lucide-react';
import { toast } from '@/shared-util';
import { iptUserApi } from '../api/iptUserApi';
import { useImportIptUsers } from '../hooks/useIptUserQueries';
import type { IptUserImportResult } from '../types';

interface IptUserImportDrawerProps {
  open: boolean;
  tenantId: number | null;
  onClose: () => void;
}

export default function IptUserImportDrawer({ open, tenantId, onClose }: IptUserImportDrawerProps) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<IptUserImportResult | null>(null);

  const { mutate: importUsers, isPending } = useImportIptUsers({
    mutationOptions: {
      onSuccess: (res) => {
        setResult(res);
        if (res.failCount === 0) toast.success(`${res.successCount}건 모두 가져왔습니다.`);
        else if (res.successCount === 0) toast.error(`전체 ${res.total}건 가져오기 실패.`);
        else toast.warning(`${res.successCount}건 성공, ${res.failCount}건 실패.`);
      },
    },
  });

  const handleClose = () => {
    if (isPending) return;
    setFile(null);
    setResult(null);
    onClose();
  };

  const handleTemplateDownload = async () => {
    const blob = await iptUserApi.downloadImportTemplate();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ipt-users-template.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleStart = () => {
    if (!tenantId || !file) return;
    setResult(null);
    importUsers({ tenantId, file });
  };

  return (
    <Drawer
      title="IPT 사용자 엑셀 가져오기"
      open={open}
      onClose={handleClose}
      width={560}
      maskClosable={!isPending}
      closable={!isPending}
      footer={
        <div className="flex justify-between">
          <Button icon={<Download className="size-3.5" />} onClick={handleTemplateDownload}>
            템플릿 다운로드
          </Button>
          <div className="flex gap-2">
            <Button onClick={handleClose} disabled={isPending}>
              닫기
            </Button>
            <Button type="primary" disabled={!file} loading={isPending} onClick={handleStart}>
              가져오기
            </Button>
          </div>
        </div>
      }
    >
      <Alert className="!mb-4" type="info" showIcon message="템플릿 형식의 .xlsx 파일을 업로드하세요. 한 번에 최대 1,000건까지 가능하며, 행 단위로 부분 성공이 지원됩니다." />

      <Upload.Dragger
        accept=".xlsx,.xls"
        maxCount={1}
        beforeUpload={(f) => {
          setFile(f);
          setResult(null);
          return false; // 자동 업로드 차단 — [가져오기] 클릭 시 전송
        }}
        onRemove={() => setFile(null)}
        fileList={file ? [{ uid: '1', name: file.name }] : []}
        disabled={isPending}
      >
        <p className="flex justify-center py-2">
          <FileSpreadsheet className="size-8 text-gray-400" />
        </p>
        <p className="text-sm text-gray-600">클릭 또는 파일을 끌어다 놓으세요</p>
      </Upload.Dragger>

      {result && (
        <div className="mt-4">
          <div className="mb-2 text-[13px] font-semibold text-gray-700">
            결과: 총 {result.total}건 — <span className="text-emerald-600">성공 {result.successCount}</span> / <span className="text-red-500">실패 {result.failCount}</span>
          </div>
          <div className="max-h-80 overflow-auto rounded border border-gray-100">
            <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-3 py-1.5 text-[12px] font-semibold text-gray-600">
              <span className="w-10">행</span>
              <span className="w-24">사용자ID</span>
              <span className="w-20">이름</span>
              <span className="w-10">결과</span>
              <span className="flex-1">메시지</span>
            </div>
            {result.rows.map((row) => (
              <div key={row.rowNum} className={`flex items-center gap-2 border-b border-gray-50 px-3 py-1.5 text-[12.5px] ${row.success ? '' : 'bg-red-50/40'}`}>
                <span className="w-10 text-gray-500">{row.rowNum}</span>
                <span className="w-24 truncate text-gray-800">{row.userId ?? '-'}</span>
                <span className="w-20 truncate text-gray-800">{row.userName ?? '-'}</span>
                <span className={`w-10 font-medium ${row.success ? 'text-emerald-600' : 'text-red-500'}`}>{row.success ? '성공' : '실패'}</span>
                <span className="flex-1 truncate text-gray-600" title={row.message ?? undefined}>
                  {row.message ?? '-'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Drawer>
  );
}
