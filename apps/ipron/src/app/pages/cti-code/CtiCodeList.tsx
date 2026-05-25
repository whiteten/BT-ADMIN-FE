/**
 * CTI 코드 관리 페이지.
 *
 * 좌측: 5 카테고리 리스트 (휴식/ACW/IC/IR/OWMS)
 * 우측: 선택 카테고리에 따라 ReasonCode 또는 MediaType 테이블
 *
 * BT-ADMIN 개선 (Phase 1 최소):
 *  - 카테고리 별 itemCount 표시 + locked 시각화
 *  - REASON_CODE: 등록/수정/삭제 (REASON_CODE=0 보호는 BE 가드)
 *  - MEDIA_TYPE: 등록/수정 (EDIT_YN=0 잠금은 BE 가드 + FE 시각)
 *  - 일괄 복사 / 사용 통계 / 인라인 편집 등은 후속 PR
 */
import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Empty, List, Space, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Lock, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import CtiCodeFormDrawer, { type CtiCodeDrawerState } from '../../features/cti-code/components/CtiCodeFormDrawer';
import { useDeleteReasonCode, useGetCtiCodeCategories, useGetMediaTypes, useGetReasonCodes } from '../../features/cti-code/hooks/useCtiCodeQueries';
import type { CtiCodeCategory, MediaTypeResponse, ReasonCodeResponse } from '../../features/cti-code/types';

const breadcrumb = [
  { title: 'IPRON', path: '/ipron' },
  { title: 'CTI 코드 관리', path: '/ipron/cti-code-mgmt' },
];

export default function CtiCodeList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<CtiCodeDrawerState>({ open: false });

  // 5 카테고리 메타
  const { data: categories = [], isLoading: catLoading, refetch: refetchCategories } = useGetCtiCodeCategories();

  // 첫 카테고리 자동 선택
  useEffect(() => {
    if (!selectedCategoryId && categories.length > 0) {
      setSelectedCategoryId(categories[0].categoryId);
    }
  }, [categories, selectedCategoryId]);

  const selectedCategory = useMemo<CtiCodeCategory | null>(() => categories.find((c) => c.categoryId === selectedCategoryId) ?? null, [categories, selectedCategoryId]);

  // REASON_CODE 또는 MEDIA_TYPE 데이터 (enabled 분기)
  const isReason = selectedCategory?.domain === 'REASON_CODE';
  const isMedia = selectedCategory?.domain === 'MEDIA_TYPE';

  const {
    data: reasonRows = [],
    isLoading: reasonLoading,
    refetch: refetchReasons,
  } = useGetReasonCodes({
    params: isReason ? { codeType: selectedCategory!.codeType ?? undefined } : undefined,
    queryOptions: { enabled: !!isReason },
  });

  const {
    data: mediaRows = [],
    isLoading: mediaLoading,
    refetch: refetchMedia,
  } = useGetMediaTypes({
    params: isMedia ? { classCd: selectedCategory!.classCd ?? undefined } : undefined,
    queryOptions: { enabled: !!isMedia },
  });

  const tableLoading = reasonLoading || mediaLoading;

  const { mutate: deleteReason } = useDeleteReasonCode({
    mutationOptions: {
      onSuccess: () => {
        toast.success('사유 코드가 삭제되었습니다');
        refetchReasons();
        refetchCategories();
      },
      onError: (err: unknown) => toast.error(extractMessage(err) ?? '삭제 실패'),
    },
  });

  // ─── ReasonCode 컬럼 ─────────────────────────────────────────────────────
  const reasonColumns: ColumnsType<ReasonCodeResponse> = [
    { title: '테넌트', dataIndex: 'tenantName', key: 'tenantName', width: 130, ellipsis: true },
    { title: '구분', dataIndex: 'codeTypeName', key: 'codeTypeName', width: 90 },
    { title: '번호', dataIndex: 'reasonCode', key: 'reasonCode', width: 70, align: 'right' },
    { title: '이름', dataIndex: 'reasonName', key: 'reasonName' },
    { title: '설명', dataIndex: 'reasonDesc', key: 'reasonDesc', ellipsis: true },
    {
      title: '액션',
      key: 'action',
      width: 140,
      render: (_, row) => {
        const protected0 = row.reasonCode === 0;
        const protectedRest1 = row.codeType === 30 && row.reasonCode === 1;
        const disabledDelete = protected0 || protectedRest1;
        return (
          <Space size={4}>
            <Button size="small" onClick={() => setDrawer({ open: true, mode: 'edit', category: selectedCategory!, reason: row })}>
              수정
            </Button>
            <Button
              size="small"
              danger
              icon={<Trash2 size={12} />}
              disabled={disabledDelete}
              onClick={() => {
                if (window.confirm(`사유 코드 "${row.reasonName}" 를 삭제하시겠습니까?`)) {
                  deleteReason({
                    tenantId: row.tenantId,
                    codeType: row.codeType,
                    reasonCode: row.reasonCode,
                  });
                }
              }}
            >
              삭제
            </Button>
          </Space>
        );
      },
    },
  ];

  // ─── MediaType 컬럼 ──────────────────────────────────────────────────────
  const mediaColumns: ColumnsType<MediaTypeResponse> = [
    {
      title: '',
      key: 'lock',
      width: 32,
      render: (_, row) => (row.locked ? <Lock size={12} color="#dc2626" /> : null),
    },
    { title: 'CODE_CD', dataIndex: 'codeCd', key: 'codeCd', width: 80 },
    { title: '코드명', dataIndex: 'codeName', key: 'codeName' },
    { title: '정렬', dataIndex: 'sortSeq', key: 'sortSeq', width: 60, align: 'right' },
    {
      title: '숨김',
      dataIndex: 'hideYn',
      key: 'hideYn',
      width: 70,
      render: (v: number | null) => (v === 1 ? <Tag color="red">숨김</Tag> : <Tag color="green">표시</Tag>),
    },
    { title: '비고', dataIndex: 'bigo', key: 'bigo', ellipsis: true },
    {
      title: '액션',
      key: 'action',
      width: 100,
      render: (_, row) => (
        <Button size="small" disabled={row.locked} onClick={() => setDrawer({ open: true, mode: 'edit', category: selectedCategory!, media: row })}>
          수정
        </Button>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 16 }}>
      <Card size="small" title="CTI 코드 관리 — 휴식/ACW 사유 + 미디어타입 통합">
        <Space>
          <Button
            icon={<RefreshCw size={14} />}
            onClick={() => {
              refetchCategories();
              refetchReasons();
              refetchMedia();
            }}
          >
            새로고침
          </Button>
        </Space>
      </Card>

      <div style={{ display: 'flex', gap: 16, alignItems: 'stretch' }}>
        {/* 좌측 카테고리 */}
        <Card size="small" title="카테고리" style={{ width: 280, flexShrink: 0 }} styles={{ body: { padding: 0 } }}>
          {catLoading ? (
            <div style={{ padding: 24, textAlign: 'center' }}>
              <Spin />
            </div>
          ) : (
            <List
              dataSource={categories}
              renderItem={(c) => {
                const selected = c.categoryId === selectedCategoryId;
                return (
                  <List.Item
                    onClick={() => setSelectedCategoryId(c.categoryId)}
                    style={{
                      cursor: 'pointer',
                      padding: '10px 14px',
                      background: selected ? '#eef0f7' : undefined,
                      borderLeft: selected ? '3px solid #405189' : '3px solid transparent',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: selected ? '#405189' : '#374151' }}>
                        {c.label} {c.locked && <Lock size={11} style={{ color: '#dc2626' }} />}
                      </div>
                      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 3 }}>
                        <Tag color={c.scope === 'SYSTEM' ? 'orange' : 'blue'} style={{ marginRight: 4 }}>
                          {c.scope}
                        </Tag>
                        {c.itemCount}건
                      </div>
                    </div>
                  </List.Item>
                );
              }}
            />
          )}
        </Card>

        {/* 우측 테이블 */}
        <Card
          size="small"
          style={{ flex: 1, minWidth: 0 }}
          title={
            selectedCategory ? (
              <Space>
                {selectedCategory.label}
                <Tag color="default">{selectedCategory.itemCount}건</Tag>
                {selectedCategory.locked && <Tag color="red">🔒 시스템</Tag>}
              </Space>
            ) : (
              '카테고리를 선택하세요'
            )
          }
          extra={
            selectedCategory && (
              <Button
                type="primary"
                icon={<Plus size={14} />}
                disabled={selectedCategory.locked && selectedCategory.domain === 'MEDIA_TYPE'}
                onClick={() => setDrawer({ open: true, mode: 'create', category: selectedCategory })}
              >
                등록
              </Button>
            )
          }
        >
          {!selectedCategory ? (
            <Empty />
          ) : isReason ? (
            <Table<ReasonCodeResponse>
              size="small"
              rowKey={(r) => `${r.tenantId}-${r.codeType}-${r.reasonCode}`}
              loading={tableLoading}
              dataSource={reasonRows}
              columns={reasonColumns}
              pagination={{ pageSize: 20, showSizeChanger: false }}
            />
          ) : (
            <Table<MediaTypeResponse>
              size="small"
              rowKey={(r) => `${r.classCd}-${r.codeCd}`}
              loading={tableLoading}
              dataSource={mediaRows}
              columns={mediaColumns}
              pagination={{ pageSize: 20, showSizeChanger: false }}
              rowClassName={(row) => (row.locked ? 'cti-row-locked' : '')}
            />
          )}
        </Card>
      </div>

      <CtiCodeFormDrawer state={drawer} onClose={() => setDrawer({ open: false })} />
    </div>
  );
}

function extractMessage(err: unknown): string | undefined {
  const e = err as { response?: { data?: { message?: string } } };
  return e?.response?.data?.message;
}
