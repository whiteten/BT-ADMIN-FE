import { useMemo, useState } from 'react';
import { Badge, Input, Modal, Skeleton } from 'antd';
import { Cpu, Monitor, PhoneCall, Plus, Search, X } from 'lucide-react';
import { DOMAIN_DOT_CLASS, DOMAIN_LABELS } from '../../constants/monitoringConstants';
import { useGetCustomWidgetCatalog } from '../../hooks/useDashboardQueries';
import type { CustomWidgetCatalogItem, DomainCode } from '../../types';

interface WidgetLibraryModalProps {
  open: boolean;
  onClose: () => void;
  onAddTemplate: () => void;
  onAddCustom: (widget: CustomWidgetCatalogItem) => void;
}

const DOMAIN_ICONS: Record<DomainCode, React.ReactNode> = {
  IE: <Cpu className="w-5 h-5" />,
  IC: <Monitor className="w-5 h-5" />,
  IR: <PhoneCall className="w-5 h-5" />,
};

/**
 * 위젯 라이브러리 모달 (FCA 디자인 테마 적용)
 * DB에서 위젯 목록을 실시간으로 조회하여 도메인별로 분류 노출.
 */
export default function WidgetLibraryModal({ open, onClose, onAddTemplate, onAddCustom }: WidgetLibraryModalProps) {
  const [searchValue, setSearchValue] = useState('');

  // DB에서 실제 위젯 카탈로그 조회
  const { data: catalogItems = [], isLoading } = useGetCustomWidgetCatalog({
    queryOptions: { enabled: open },
  });

  const filteredWidgets = useMemo(() => {
    const val = searchValue.toLowerCase().trim();
    if (!val) return catalogItems;
    return catalogItems.filter((w) => w.widgetName.toLowerCase().includes(val) || w.description?.toLowerCase().includes(val));
  }, [catalogItems, searchValue]);

  const groupedWidgets = useMemo(() => {
    const groups: Record<DomainCode, CustomWidgetCatalogItem[]> = { IE: [], IC: [], IR: [] };
    filteredWidgets.forEach((w) => {
      // domainCode 가 유효한 경우만 분류 (안전 장치)
      if (groups[w.domainCode]) {
        groups[w.domainCode].push(w);
      }
    });
    return groups;
  }, [filteredWidgets]);

  const domains = (['IE', 'IC', 'IR'] as DomainCode[]).filter((d) => groupedWidgets[d] && groupedWidgets[d].length > 0);

  return (
    <Modal
      title={
        <div className="flex items-center gap-3">
          <span className="text-[17px] font-bold text-[#495057]">위젯 라이브러리</span>
          <Badge status="processing" color="#085fb5" text={<span className="text-[11px] font-bold text-[#085fb5] mono uppercase tracking-wider">Asset Library</span>} />
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={1100}
      centered
      closeIcon={
        <div className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[#f1f3f5] transition-colors">
          <X className="h-5 w-5 text-[#868e96]" />
        </div>
      }
      styles={{
        header: {
          padding: '20px 32px',
          borderBottom: '1px solid #f1f3f5',
          marginBottom: 0,
        },
        body: {
          padding: 0,
          backgroundColor: '#f8f9fa',
          height: '750px',
          overflow: 'hidden',
        },
      }}
    >
      <div className="flex flex-col h-full">
        {/* 검색바 */}
        <div className="bg-white px-8 py-5 border-b border-[#f1f3f5] flex items-center justify-between gap-6">
          <Input
            placeholder="시스템명 또는 위젯 명칭으로 검색하세요"
            prefix={<Search className="w-4 h-4 text-[#adb5bd] mr-1" />}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            allowClear
            disabled={isLoading}
            className="fca-input-round h-11 max-w-lg"
          />
          {!isLoading && (
            <div className="text-[12.5px] text-[#868e96]">
              총 <span className="font-bold text-[#495057]">{filteredWidgets.length}</span>개의 위젯 자산
            </div>
          )}
        </div>

        {/* 그리드 영역 */}
        <div className="flex-1 overflow-y-auto p-8 space-y-12 scrollbar-hide">
          {isLoading ? (
            <div className="grid grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white p-6 rounded-2xl border border-[#dee2e6] space-y-4">
                  <Skeleton.Button active block style={{ height: 48, borderRadius: 12 }} />
                  <Skeleton active paragraph={{ rows: 2 }} />
                </div>
              ))}
            </div>
          ) : domains.length > 0 ? (
            domains.map((domain) => (
              <section key={domain}>
                <div className="flex items-center gap-3 mb-6">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-sm ${DOMAIN_DOT_CLASS[domain]}`}>{DOMAIN_ICONS[domain]}</div>
                  <div>
                    <h3 className="text-[16px] font-bold text-[#495057] tracking-tight leading-none">{DOMAIN_LABELS[domain]}</h3>
                    <p className="text-[11px] text-[#adb5bd] font-medium mt-1.5 uppercase tracking-widest mono">{domain} System specialized assets</p>
                  </div>
                  <div className="flex-1 h-[1px] bg-[#e9ecef] ml-2" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {groupedWidgets[domain].map((widget) => (
                    <button
                      key={widget.widgetTypeId}
                      type="button"
                      onClick={() => (widget.kind === 'TEMPLATE' ? onAddTemplate() : onAddCustom(widget))}
                      className="group relative flex flex-col bg-white border border-[#dee2e6] rounded-2xl p-6 text-left transition-all hover:border-[#085fb5] hover:shadow-xl hover:-translate-y-1 active:scale-[0.98]"
                    >
                      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f8f9fa] text-[#adb5bd] border border-[#f1f3f5] group-hover:bg-[#e7f0fa] group-hover:text-[#085fb5] group-hover:border-transparent transition-all shadow-sm">
                        {DOMAIN_ICONS[domain]}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[15px] font-bold text-[#495057] group-hover:text-[#085fb5] transition-colors truncate pr-12">{widget.widgetName}</span>
                        </div>
                        <p className="text-[12.5px] text-[#868e96] leading-relaxed line-clamp-2">{widget.description || '이 위젯에 대한 설명이 없습니다.'}</p>

                        <div className="mt-4 flex items-center gap-2">
                          <span
                            className={`text-[9px] font-black px-1.5 py-0.5 rounded border uppercase tracking-tighter ${
                              domain === 'IE'
                                ? 'bg-[#e7f0fa] text-[#085fb5] border-[#cfe2ff]'
                                : domain === 'IC'
                                  ? 'bg-[#e6fcf5] text-[#0ca678] border-[#c3fae8]'
                                  : 'bg-[#fff9db] text-[#f08c00] border-[#fff3bf]'
                            }`}
                          >
                            {DOMAIN_LABELS[domain]}
                          </span>
                          {widget.widgetCategory && <span className="text-[10px] font-bold text-[#adb5bd] uppercase tracking-widest mono">{widget.widgetCategory}</span>}
                        </div>
                      </div>

                      <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity bg-[#085fb5] text-white p-1.5 rounded-lg shadow-lg">
                        <Plus className="w-4 h-4" strokeWidth={2.5} />
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            ))
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center py-20">
              <Badge status="default" text={<span className="text-[14px] text-[#adb5bd]">등록된 위젯이 없습니다.</span>} />
            </div>
          )}
        </div>

        <div className="px-10 py-5 bg-white border-t border-[#f1f3f5] flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-[12px] text-[#adb5bd]">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#e7f0fa] text-[#085fb5] font-bold text-[10px]">!</span>
            <span>선택한 위젯은 대시보드의 확보된 영역에 즉시 배치됩니다.</span>
          </div>
          <div className="text-[11px] text-[#adb5bd] mono">BT-ADMIN INSIGHT LIBRARY</div>
        </div>
      </div>
    </Modal>
  );
}
