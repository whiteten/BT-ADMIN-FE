/**
 * 리소스 섹션 컴포넌트
 * - 여러 리소스 타입을 하나의 ag-Grid에 통합 표시 (RESOURCE_TYPE 컬럼 포함)
 * - 단일 "리소스 추가" 버튼으로 통합 Drawer 오픈 (Drawer 내부에서 타입별 섹션)
 * - Deferred Save 패턴: 로컬 상태만 변경, 부모가 저장 처리
 */

import { useRef } from 'react';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Card, Tag } from 'antd';
import { Plus } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import ResourceAddDrawer, { type ResourceAddDrawerRef } from './ResourceAddDrawer';
import type { AssignedResource, AvailableResource } from '../types/userResource.types';
import { IconTrash } from '@/components/custom/Icons';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

/** 리소스 그룹 정의 (타입별 소스/할당/콜백) */
export interface ResourceGroup {
  resourceType: string;
  title: string;
  drawerTitle: string;
  availableResources: AvailableResource[];
  assignedItems: AssignedResource[];
  onAssignedItemsChange: (items: AssignedResource[]) => void;
}

interface ResourceSectionProps {
  title?: string;
  groups: ResourceGroup[];
  loading?: boolean;
}

/** 그리드 행 타입: 할당된 리소스 + 타입 표시용 */
type AssignedRow = AssignedResource & { resourceType: string };

export default function ResourceSection({ title = '리소스 접근', groups, loading = false }: ResourceSectionProps) {
  const drawerRef = useRef<ResourceAddDrawerRef>(null);
  const { gridOptions } = useAggridOptions();

  // 모든 그룹의 할당 항목을 하나로 합치고 resourceType 부여
  const rowData: AssignedRow[] = groups.flatMap((group) =>
    group.assignedItems.map((item) => ({
      ...item,
      resourceType: group.resourceType,
    })),
  );

  // 인라인 삭제 핸들러 (resourceType으로 그룹 식별)
  const handleRemove = (resourceType: string, resourceId: string) => {
    const group = groups.find((g) => g.resourceType === resourceType);
    if (!group) return;
    const remaining = group.assignedItems.filter((item) => item.resourceId !== resourceId);
    group.onAssignedItemsChange(remaining);
  };

  // 통합 Drawer 열기
  const handleOpenDrawer = () => {
    const alreadyAssignedIdsByType: Record<string, string[]> = {};
    groups.forEach((group) => {
      alreadyAssignedIdsByType[group.resourceType] = group.assignedItems.map((item) => item.resourceId);
    });
    drawerRef.current?.open({ alreadyAssignedIdsByType });
  };

  // 리소스 추가 핸들러 (타입별 선택 결과를 각 그룹 콜백에 분배)
  const handleAdd = (selectedIdsByType: Record<string, string[]>) => {
    groups.forEach((group) => {
      const newIds = selectedIdsByType[group.resourceType] ?? [];
      if (newIds.length === 0) return;
      const newItems: AssignedResource[] = newIds.map((id) => {
        const found = findResourceById(group.availableResources, id);
        return {
          resourceId: id,
          resourceName: found?.name ?? id,
          description: found?.description,
          tag: found?.tag,
        };
      });
      group.onAssignedItemsChange([...group.assignedItems, ...newItems]);
    });
  };

  // ag-Grid 컬럼 정의
  const columnDefs: ColDef<AssignedRow>[] = [
    {
      headerName: 'RESOURCE_TYPE',
      field: 'resourceType',
      width: 180,
    },
    {
      headerName: 'ID',
      field: 'resourceId',
      width: 200,
    },
    {
      headerName: '이름',
      field: 'resourceName',
      flex: 1,
      cellRenderer: (params: ICellRendererParams<AssignedRow>) => {
        const { data } = params;
        if (!data) return null;
        return (
          <span>
            {data.resourceName}
            {data.tag && (
              <Tag color="blue" className="ml-2">
                {data.tag}
              </Tag>
            )}
          </span>
        );
      },
    },
    {
      headerName: '설명',
      field: 'description',
      flex: 1,
      valueFormatter: (params) => params.value || '-',
    },
    {
      headerName: '',
      maxWidth: 60,
      sortable: false,
      filter: false,
      suppressHeaderMenuButton: true,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: (params: ICellRendererParams<AssignedRow>) => {
        const { data } = params;
        if (!data) return null;
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleRemove(data.resourceType, data.resourceId);
            }}
          >
            <IconTrash className="size-5 text-red-500 hover:cursor-pointer" />
          </button>
        );
      },
    },
  ];

  return (
    <Card
      title={title}
      extra={
        <Button icon={<Plus className="h-4 w-4" />} onClick={handleOpenDrawer}>
          리소스 추가
        </Button>
      }
      className="shadow-sm"
      styles={{ header: { borderBottom: '1px solid #f0f0f0' }, body: { padding: 0 } }}
      style={{ marginBottom: '50px' }}
    >
      {/* 통합 리소스 그리드 */}
      <div className="h-[500px]">
        <AgGridReact<AssignedRow>
          rowData={rowData}
          columnDefs={columnDefs}
          gridOptions={gridOptions}
          loading={loading}
          getRowId={(params) => `${params.data.resourceType}:${params.data.resourceId}`}
          noRowsOverlayComponent={() => <span className="text-gray-400">등록된 리소스가 없습니다.</span>}
        />
      </div>

      {/* 통합 추가 Drawer */}
      <ResourceAddDrawer
        ref={drawerRef}
        title="리소스 추가"
        groups={groups.map((g) => ({
          resourceType: g.resourceType,
          title: g.title,
          availableResources: g.availableResources,
        }))}
        onConfirm={handleAdd}
      />
    </Card>
  );
}

/** AvailableResource 트리에서 ID로 항목 찾기 (재귀) */
function findResourceById(resources: AvailableResource[], id: string): AvailableResource | undefined {
  for (const resource of resources) {
    if (resource.id === id) return resource;
    if (resource.children) {
      const found = findResourceById(resource.children, id);
      if (found) return found;
    }
  }
  return undefined;
}
