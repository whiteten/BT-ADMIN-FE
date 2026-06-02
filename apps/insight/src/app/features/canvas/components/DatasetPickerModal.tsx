import { useMemo, useState } from 'react';
import { Badge, Input, Modal, Skeleton } from 'antd';
import { Database, Plus, Search, X } from 'lucide-react';
import { useGetDatasets } from '../../dataset/hooks/useDatasetQueries';

interface DatasetPickerModalProps {
  open: boolean;
  onClose: () => void;
  /** 현재 보고서 기본 데이터셋 — 추천 표시용 */
  defaultDatasetId?: number;
  /** 데이터셋 선택 → 패널 편집으로 */
  onSelect: (datasetId: number) => void;
}

/**
 * 데이터셋 선택 모달. (모니터링 위젯 라이브러리 톤앤매너)
 * 패널 종류 선택 다음 단계 — 선택 즉시 패널 편집 드로어로 연결.
 */
export default function DatasetPickerModal({ open, onClose, defaultDatasetId, onSelect }: DatasetPickerModalProps) {
  const [searchValue, setSearchValue] = useState('');
  const { data: datasets = [], isLoading } = useGetDatasets({ queryOptions: { enabled: open } });

  const filtered = useMemo(() => {
    const val = searchValue.toLowerCase().trim();
    if (!val) return datasets;
    return datasets.filter((d) => d.datasourceName?.toLowerCase().includes(val) || d.productCode?.toLowerCase().includes(val));
  }, [datasets, searchValue]);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title={
        <div className="flex items-center gap-3">
          <span className="text-[17px] font-bold text-[#495057]">데이터셋 선택</span>
          <Badge status="processing" color="#085fb5" text={<span className="text-[11px] font-bold text-[#085fb5] mono uppercase tracking-wider">Dataset</span>} />
        </div>
      }
      width={900}
      centered
      closeIcon={
        <div className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[#f1f3f5] transition-colors">
          <X className="h-5 w-5 text-[#868e96]" />
        </div>
      }
      styles={{
        header: { padding: '20px 32px', borderBottom: '1px solid #f1f3f5', marginBottom: 0 },
        body: { padding: 0, backgroundColor: '#f8f9fa', height: '620px', overflow: 'hidden' },
      }}
    >
      <div className="flex flex-col h-full">
        <div className="bg-white px-8 py-5 border-b border-[#f1f3f5] flex items-center justify-between gap-6">
          <Input
            placeholder="데이터셋명 또는 제품코드로 검색하세요"
            prefix={<Search className="w-4 h-4 text-[#adb5bd] mr-1" />}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            allowClear
            disabled={isLoading}
            className="fca-input-round h-11 max-w-lg"
          />
          {!isLoading && (
            <div className="text-[12.5px] text-[#868e96]">
              총 <span className="font-bold text-[#495057]">{filtered.length}</span>개의 데이터셋
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">
          {isLoading ? (
            <div className="grid grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white p-6 rounded-2xl border border-[#dee2e6] space-y-4">
                  <Skeleton.Button active block style={{ height: 48, borderRadius: 12 }} />
                  <Skeleton active paragraph={{ rows: 1 }} />
                </div>
              ))}
            </div>
          ) : filtered.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((d) => {
                const isDefault = d.datasetId === defaultDatasetId;
                return (
                  <button
                    key={d.datasetId}
                    type="button"
                    onClick={() => onSelect(d.datasetId)}
                    className="group relative flex flex-col bg-white border border-[#dee2e6] rounded-2xl p-6 text-left transition-all hover:border-[#085fb5] hover:shadow-xl hover:-translate-y-1 active:scale-[0.98]"
                  >
                    <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f8f9fa] text-[#adb5bd] border border-[#f1f3f5] group-hover:bg-[#e7f0fa] group-hover:text-[#085fb5] group-hover:border-transparent transition-all shadow-sm">
                      <Database className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[15px] font-bold text-[#495057] group-hover:text-[#085fb5] transition-colors truncate">{d.datasourceName || `#${d.datasetId}`}</span>
                        {isDefault && (
                          <span className="shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded border uppercase bg-[#e7f0fa] text-[#085fb5] border-[#cfe2ff]">기본</span>
                        )}
                      </div>
                      {d.productCode && <span className="text-[10px] font-bold text-[#adb5bd] uppercase tracking-widest mono">{d.productCode}</span>}
                    </div>
                    <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity bg-[#085fb5] text-white p-1.5 rounded-lg shadow-lg">
                      <Plus className="w-4 h-4" strokeWidth={2.5} />
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center py-20">
              <Badge status="default" text={<span className="text-[14px] text-[#adb5bd]">등록된 데이터셋이 없습니다.</span>} />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
