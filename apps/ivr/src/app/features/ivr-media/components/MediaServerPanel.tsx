/**
 * Media Server 탭 패널 (IPR20S6041).
 *
 * 선택된 시스템의 Media Server 1건을 정보 카드 형식으로 표시.
 * 미등록 시 Empty 안내 텍스트만 — 등록은 헤더 상단 [+ Media Server] 버튼으로 통일 (IPRON 표준 UX).
 */
import { Button, Empty } from 'antd';
import { Pencil, Trash2 } from 'lucide-react';
import { useGetMediaServer } from '../hooks/useIvrMediaQueries';
import type { IrMediaServer } from '../types/ivrMedia.types';

interface Props {
  systemId: number | null;
  systemName: string;
  onEdit: (systemId: number, systemName: string, data: IrMediaServer) => void;
  onDelete: (systemId: number) => void;
}

interface RowProps {
  label: string;
  value: string | number | null | undefined;
}

function InfoRow({ label, value }: RowProps) {
  return (
    <>
      <div className="text-[12.5px] text-gray-500 font-medium">{label}</div>
      <div className="text-[13px] text-gray-800 truncate" title={String(value ?? '-')}>
        {value === null || value === undefined || value === '' ? '-' : String(value)}
      </div>
    </>
  );
}

export default function MediaServerPanel({ systemId, systemName, onEdit, onDelete }: Props) {
  const { data, isLoading } = useGetMediaServer({
    params: systemId ? { id: systemId } : undefined,
    queryOptions: { enabled: !!systemId },
  });

  if (!systemId) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 text-gray-400 gap-3 p-6">
        <Empty description={false} />
        <span className="text-sm">시스템을 선택하면 Media Server 정보를 확인할 수 있습니다</span>
      </div>
    );
  }

  if (isLoading) {
    return <div className="flex items-center justify-center flex-1 text-gray-400 text-sm">불러오는 중...</div>;
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 text-gray-400 gap-2 p-6">
        <Empty description={false} />
        <span className="text-sm">
          <b>{systemName}</b> 시스템에 등록된 Media Server가 없습니다
        </span>
        <span className="text-[12px] text-gray-400">상단 [+ Media Server] 버튼으로 등록하세요</span>
      </div>
    );
  }

  return (
    <div className="p-4 overflow-auto">
      <div className="border border-gray-200 rounded-lg p-4" style={{ background: 'linear-gradient(180deg, #fafbff 0%, #ffffff 100%)' }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-[#405189] border border-blue-200" title={systemName}>
              {systemName}
            </span>
            <span className="text-[13px] font-semibold text-gray-800">Media Server</span>
          </div>
          <div className="flex items-center gap-2">
            <Button icon={<Pencil className="size-3.5" />} onClick={() => onEdit(systemId, systemName, data)}>
              편집
            </Button>
            <Button danger icon={<Trash2 className="size-3.5" />} onClick={() => onDelete(systemId)}>
              삭제
            </Button>
          </div>
        </div>

        {/* Info grid: 2열 라벨/값 */}
        <div className="grid gap-x-4 gap-y-2.5" style={{ gridTemplateColumns: '110px 1fr 110px 1fr' }}>
          <InfoRow label="성우수" value={data.speakerCnt} />
          <InfoRow label="DTMF" value={data.dtmfOption} />
          <InfoRow label="RTP IP" value={data.rtpIp} />
          <InfoRow label="RTP Codec" value={data.rtpCodec} />
          <InfoRow label="ASR IP" value={data.asrIp} />
          <InfoRow label="ASR PORT" value={data.asrPort} />
          <InfoRow label="Backup IP" value={data.asrBackupIp} />
          <InfoRow label="Backup PORT" value={data.asrBackupPort} />
          <InfoRow label="Grammar Path" value={data.grammarPath} />
          <InfoRow label="작업일시" value={data.workTime} />
        </div>
      </div>
    </div>
  );
}
