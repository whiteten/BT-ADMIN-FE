/**
 * 엑셀 가져오기 버튼 — CSV/XLSX 파일을 브라우저에서 파싱 후 row list 를 BE 로 전송.
 *
 * <p>의존성 최소화 위해 CSV 단순 파싱 (헤더: DNIS,서비스번호명,시나리오ID,통신사,설명).
 * XLSX 필요 시 sheetjs(xlsx) 도입.</p>
 */
import { useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Upload } from 'antd';
import { Upload as UploadIcon } from 'lucide-react';
import { toast } from '@/shared-util';
import { dnisQueryKeys, useExcelImportDnis } from '../hooks/useDnisQueries';
import type { DnisCreateRequest } from '../types/dnis.types';

interface Props {
  selectedNode: { nodeId: number } | null;
  selectedTenantId: number | null;
}

export default function DnisExcelImportButton({ selectedNode, selectedTenantId }: Props) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const { mutate: importMutate, isPending } = useExcelImportDnis({
    mutationOptions: {
      onSuccess: (res) => {
        toast.success(`엑셀 가져오기 성공: ${res.successCount}/${res.totalCount}건`);
        queryClient.invalidateQueries({ queryKey: dnisQueryKeys.list._def });
      },
      onError: (err) => toast.error(`엑셀 가져오기 실패: ${(err as Error).message ?? '오류'}`),
    },
  });

  const handleFile = async (file: File) => {
    if (!selectedNode || !selectedTenantId) {
      toast.warning('먼저 노드와 테넌트를 선택하세요.');
      return false;
    }
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('#'));
    if (lines.length < 2) {
      toast.error('파일 내용이 비어있거나 헤더만 있습니다.');
      return false;
    }
    // 헤더 1줄 skip
    const rows: DnisCreateRequest[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
      if (cols.length < 3) continue;
      const [dnisNo, dnisName, serviceIdStr, telcoKindStr, dnisDesc] = cols;
      const serviceId = Number(serviceIdStr);
      if (!dnisNo || !dnisName || !serviceId) continue;
      rows.push({
        nodeId: selectedNode.nodeId,
        dnisNo,
        dnisName,
        serviceId,
        tenantId: selectedTenantId,
        telcoKind: telcoKindStr ? Number(telcoKindStr) : null,
        dnisDesc: dnisDesc || null,
      });
    }
    if (rows.length === 0) {
      toast.error('유효한 데이터가 없습니다. (CSV 헤더: DNIS,서비스번호명,시나리오ID,통신사,설명)');
      return false;
    }
    importMutate(rows);
    return false;
  };

  return (
    <Upload accept=".csv,.txt" showUploadList={false} beforeUpload={handleFile}>
      <Button icon={<UploadIcon className="size-3.5" />} loading={isPending}>
        가져오기
      </Button>
    </Upload>
  );
}
