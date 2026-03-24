import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Checkbox } from 'antd';
import { toast } from '@/shared-util';
import ClusterAllocModal, { type ClusterAllocModalRef } from '../../features/license/components/ClusterAllocModal';
import LicenseCardSlider from '../../features/license/components/LicenseCardSlider';
import LicenseDetailSidebar from '../../features/license/components/LicenseDetailSidebar';
import LicenseGroupTable from '../../features/license/components/LicenseGroupTable';
import LicenseRegisterDrawer, { type LicenseRegisterDrawerRef } from '../../features/license/components/LicenseRegisterDrawer';
import LicenseUsageSummary from '../../features/license/components/LicenseUsageSummary';
import {
  licenseQueryKeys,
  useCreateLicense,
  useDeleteLicense,
  useGetClusterAllocations,
  useGetLicenseDetail,
  useGetLicenses,
  useGetTotalUsage,
  useUpdateClusterAllocations,
} from '../../features/license/hooks/useLicenseQueries';
import { type ClusterAllocation, LICENSE_GROUP_ORDER, type ServerGroupUsage, type UpdateClusterRequest } from '../../features/license/types/license.types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import NoData from '@/components/custom/NoData';
import PageHeader from '@/components/custom/PageHeader';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [
  { title: '시스템', path: '/manager/resource/menu' },
  { title: '플랫폼', path: '/manager/resource/license/list' },
  { title: '라이선스', path: '/manager/resource/license/list' },
];

export default function LicenseList() {
  const queryClient = useQueryClient();
  const modal = useModal();
  const registerDrawerRef = useRef<LicenseRegisterDrawerRef>(null);
  const clusterModalRef = useRef<ClusterAllocModalRef>(null);

  // 상태
  const [selectedLicenseId, setSelectedLicenseId] = useState<number | null>(null);
  const [activeOnly, setActiveOnly] = useState(true);
  const [clusterQueryParams, setClusterQueryParams] = useState<{ licenseId: number; licenseKind: string } | null>(null);

  // ─── 데이터 조회 ──────────────────────────────────────────────────────────────

  // 라이선스 목록 조회
  const { data: licenseList, isLoading: isListLoading } = useGetLicenses({});

  // 선택된 라이선스 상세 (사이드바 표시용)
  const { data: licenseDetail, isLoading: isDetailLoading } = useGetLicenseDetail({
    params: { licenseId: selectedLicenseId },
    queryOptions: { enabled: !!selectedLicenseId },
  });

  // 전체 활성 라이선스 사용 현황 (항상 조회 - 메인 영역 고정)
  const { data: totalUsage } = useGetTotalUsage({});

  // 클러스터 할당 조회 (모달 열기 시)
  useGetClusterAllocations({
    params: clusterQueryParams ?? {},
    queryOptions: { enabled: !!clusterQueryParams },
  });

  // ─── 뮤테이션 ────────────────────────────────────────────────────────────────

  const { mutate: deleteLicense } = useDeleteLicense({
    mutationOptions: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: licenseQueryKeys.getLicenses._def });
        queryClient.invalidateQueries({ queryKey: licenseQueryKeys.getTotalUsage.queryKey });
        toast.success('라이선스가 삭제되었습니다.');
        if (selectedLicenseId) setSelectedLicenseId(null);
      },
    },
  });

  const { mutate: createLicense, isPending: isCreating } = useCreateLicense({
    mutationOptions: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: licenseQueryKeys.getLicenses._def });
        queryClient.invalidateQueries({ queryKey: licenseQueryKeys.getTotalUsage.queryKey });
        toast.success('라이선스가 등록되었습니다.');
        registerDrawerRef.current?.close();
      },
    },
  });

  const { mutate: updateClusters, isPending: isUpdatingClusters } = useUpdateClusterAllocations({
    mutationOptions: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: licenseQueryKeys.getTotalUsage.queryKey });
        if (clusterQueryParams) {
          queryClient.invalidateQueries({ queryKey: licenseQueryKeys.getClusterAllocations(clusterQueryParams).queryKey });
        }
        toast.success('클러스터 할당이 저장되었습니다.');
        clusterModalRef.current?.close();
      },
    },
  });

  // ─── 표시 데이터 ──────────────────────────────────────────────────────────────

  // 클라이언트 사이드 필터링 (백엔드 activeOnly 미지원)
  const filteredList = activeOnly ? (licenseList ?? []).filter((l) => l.status === 'ACTIVE' || l.status === 'EXPIRING') : (licenseList ?? []);

  // 메인 영역: 항상 전체 활성 라이선스 사용 현황 표시
  const serverGroups: ServerGroupUsage[] = totalUsage?.serverGroups ?? [];

  // 그룹 순서 정렬
  const orderedGroups = [
    ...LICENSE_GROUP_ORDER.map((code) => serverGroups.find((g) => g.serverGroup === code)).filter((g): g is ServerGroupUsage => !!g),
    ...serverGroups.filter((g) => !LICENSE_GROUP_ORDER.includes(g.serverGroup as (typeof LICENSE_GROUP_ORDER)[number])),
  ];

  // ─── 핸들러 ──────────────────────────────────────────────────────────────────

  const handleSelect = (licenseId: number) => {
    setSelectedLicenseId((prev) => (prev === licenseId ? null : licenseId));
  };

  const handleCloseSidebar = () => {
    setSelectedLicenseId(null);
  };

  const handleDelete = (licenseId: number) => {
    modal.confirm.delete({
      onOk: () => deleteLicense({ licenseId }),
    });
  };

  const handleRegister = (licenseKey: string) => {
    createLicense({ licenseKey });
  };

  const handleClusterAlloc = (licenseKind: string) => {
    // 전체 사용현황 테이블에서 해당 항목 찾기
    const usageItem = serverGroups.flatMap((g) => g.items).find((item) => item.licenseKind === licenseKind);
    if (!usageItem) return;

    setClusterQueryParams({ licenseId: 0, licenseKind });

    // 캐시에서 클러스터 데이터 확인
    const cachedClusters = queryClient.getQueryData<ClusterAllocation[]>(licenseQueryKeys.getClusterAllocations({ licenseId: 0, licenseKind }).queryKey);

    const openModal = (clusters: ClusterAllocation[]) => {
      clusterModalRef.current?.open({
        licenseKind,
        kindName: usageItem.licenseKindName,
        clusters,
        totalQty: usageItem.totalQuantity ?? 0,
      });
    };

    if (cachedClusters) {
      openModal(cachedClusters);
    } else {
      setTimeout(() => {
        const data = queryClient.getQueryData<ClusterAllocation[]>(licenseQueryKeys.getClusterAllocations({ licenseId: 0, licenseKind }).queryKey);
        openModal(data ?? []);
      }, 500);
    }
  };

  const handleSaveClusters = ({ licenseKind, request }: { licenseKind: string; request: UpdateClusterRequest }) => {
    updateClusters({ licenseKind, data: request });
  };

  const handleOpenRegisterDrawer = () => {
    registerDrawerRef.current?.open();
  };

  // ─── 렌더 ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader breadcrumb={breadcrumb} />

      {/* 필터 바 */}
      <div className="flex items-center justify-between gap-2 w-full h-[76px] bg-white bt-shadow px-7 py-5">
        <div className="flex gap-4 items-center">
          <Checkbox
            checked={activeOnly}
            onChange={(e) => {
              setActiveOnly(e.target.checked);
              setSelectedLicenseId(null);
            }}
          >
            활성 라이선스만 표시
          </Checkbox>
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{filteredList.length}건</span>
        </div>
        <Button type="primary" onClick={handleOpenRegisterDrawer}>
          등록
        </Button>
      </div>

      {/* 콘텐츠 영역 */}
      <div className="flex flex-1 min-h-0 gap-4">
        {/* 메인 영역 */}
        <div className="flex flex-col gap-4 flex-1 min-w-0 overflow-y-auto p-7 bg-white bt-shadow">
          {/* 카드 슬라이더 */}
          {isListLoading ? (
            <div className="flex items-center justify-center h-[160px]">
              <FallbackSpinner />
            </div>
          ) : filteredList.length > 0 ? (
            <LicenseCardSlider licenses={filteredList} selectedId={selectedLicenseId} onSelect={handleSelect} onDelete={handleDelete} />
          ) : (
            <div className="flex items-center justify-center h-[160px]">
              <NoData message="등록된 라이선스가 없습니다." iconSize={50} />
            </div>
          )}

          {/* 전체 활성 라이선스 사용 현황 요약 (항상 고정) */}
          {serverGroups.length > 0 && <LicenseUsageSummary serverGroups={serverGroups} label="전체" licenseCount={filteredList.length} />}

          {/* 제품군별 테이블 (항상 전체 사용 현황) */}
          {orderedGroups.length > 0 ? (
            <div className="flex flex-col gap-4 pb-4">
              {orderedGroups.map((group) => (
                <LicenseGroupTable
                  key={group.serverGroup}
                  groupCode={group.serverGroup}
                  groupName={group.serverGroupName}
                  items={group.items}
                  onClusterAlloc={handleClusterAlloc}
                />
              ))}
            </div>
          ) : null}
        </div>

        {/* 사이드바: 선택한 라이선스 상세 항목 */}
        {selectedLicenseId && <LicenseDetailSidebar detail={licenseDetail} isLoading={isDetailLoading} onClose={handleCloseSidebar} />}
      </div>

      {/* Drawer / Modal */}
      <LicenseRegisterDrawer ref={registerDrawerRef} onRegister={handleRegister} isLoading={isCreating} />
      <ClusterAllocModal ref={clusterModalRef} onSave={handleSaveClusters} isLoading={isUpdatingClusters} />
    </div>
  );
}
