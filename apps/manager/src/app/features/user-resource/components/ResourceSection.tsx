/**
 * 리소스 섹션 컴포넌트
 * - 할당된 리소스 목록 (ag-Grid + 인라인 삭제 아이콘)
 * - 추가 Drawer (Ant Design Tree checkable)
 * - Deferred Save 패턴: 로컬 상태만 변경, 부모가 저장 처리
 */

import { useRef } from 'react';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Card, Tag } from 'antd';
import { Plus } from 'lucide-react';
import ResourceAddDrawer, { type ResourceAddDrawerRef } from './ResourceAddDrawer';
import type { AssignedResource, AvailableResource } from '../types/userResource.types';
import { IconTrash } from '@/components/custom/Icons';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

interface ResourceSectionProps {
  title: string;
  drawerTitle: string;
  availableResources: AvailableResource[];
  assignedItems: AssignedResource[];
  onAssignedItemsChange: (items: AssignedResource[]) => void;
  loading?: boolean;
}

export default function ResourceSection({ title, drawerTitle, availableResources, assignedItems, onAssignedItemsChange, loading = false }: ResourceSectionProps) {
  const drawerRef = useRef<ResourceAddDrawerRef>(null);
  const { gridOptions } = useAggridOptions();

  const alreadyAssignedIds = assignedItems.map((item) => item.resourceId);

  // 인라인 삭제 핸들러
  const handleRemove = (resourceId: string) => {
    const remaining = assignedItems.filter((item) => item.resourceId !== resourceId);
    onAssignedItemsChange(remaining);
  };

  // Drawer 열기
  const handleOpenDrawer = () => {
    drawerRef.current?.open({ alreadyAssignedIds });
  };

  // 리소스 추가 핸들러
  const handleAdd = (newIds: string[]) => {
    const newItems: AssignedResource[] = newIds.map((id) => {
      const found = findResourceById(availableResources, id);
      return {
        resourceId: id,
        resourceName: found?.name ?? id,
        description: found?.description,
        tag: found?.tag,
      };
    });
    onAssignedItemsChange([...assignedItems, ...newItems]);
  };

  // ag-Grid 컬럼 정의
  const columnDefs: ColDef<AssignedResource>[] = [
    {
      headerName: 'ID',
      field: 'resourceId',
      width: 200,
    },
    {
      headerName: '이름',
      field: 'resourceName',
      flex: 1,
      cellRenderer: (params: ICellRendererParams<AssignedResource>) => {
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
      cellRenderer: (params: ICellRendererParams<AssignedResource>) => {
        const { data } = params;
        if (!data) return null;
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleRemove(data.resourceId);
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
          추가
        </Button>
      }
      className="shadow-sm"
      styles={{ header: { borderBottom: '1px solid #f0f0f0' }, body: { padding: 0 } }}
      style={{ marginBottom: '50px' }}
    >
      {/* 할당된 리소스 그리드 */}
      <div className="h-[300px]">
        <AgGridReact<AssignedResource>
          rowData={assignedItems}
          columnDefs={columnDefs}
          gridOptions={gridOptions}
          loading={loading}
          getRowId={(params) => params.data.resourceId}
          noRowsOverlayComponent={() => <span className="text-gray-400">{`등록된 ${title}이(가) 없습니다.`}</span>}
        />
      </div>

      {/* 추가 Drawer */}
      <ResourceAddDrawer ref={drawerRef} title={drawerTitle} availableResources={availableResources} onConfirm={handleAdd} />
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
