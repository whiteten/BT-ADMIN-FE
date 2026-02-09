/**
 * 리소스 섹션 컴포넌트
 * - 할당된 리소스 목록 (Ant Design Table + rowSelection)
 * - 추가 Drawer (Ant Design Tree checkable)
 * - 선택 삭제 기능
 * - Deferred Save 패턴: 로컬 상태만 변경, 부모가 저장 처리
 */

import { useRef, useState } from 'react';
import { Button, Card, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Minus, Plus } from 'lucide-react';
import ResourceAddDrawer, { type ResourceAddDrawerRef } from './ResourceAddDrawer';
import type { AssignedResource, AvailableResource } from '../types/userResource.types';

interface ResourceSectionProps {
  title: string;
  drawerTitle: string;
  availableResources: AvailableResource[];
  assignedItems: AssignedResource[];
  onAssignedItemsChange: (items: AssignedResource[]) => void;
  loading?: boolean;
}

const columns: ColumnsType<AssignedResource> = [
  {
    title: 'ID',
    dataIndex: 'resourceId',
    key: 'resourceId',
    width: 200,
  },
  {
    title: '이름',
    dataIndex: 'resourceName',
    key: 'resourceName',
    width: 200,
    render: (name: string, record) => (
      <span>
        {name}
        {record.tag && (
          <Tag color="blue" className="ml-2">
            {record.tag}
          </Tag>
        )}
      </span>
    ),
  },
  {
    title: '설명',
    dataIndex: 'description',
    key: 'description',
    ellipsis: true,
    render: (desc: string) => desc || '-',
  },
];

export default function ResourceSection({ title, drawerTitle, availableResources, assignedItems, onAssignedItemsChange, loading = false }: ResourceSectionProps) {
  const drawerRef = useRef<ResourceAddDrawerRef>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const alreadyAssignedIds = assignedItems.map((item) => item.resourceId);

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

  // 선택 삭제 핸들러
  const handleRemoveSelected = () => {
    const remaining = assignedItems.filter((item) => !selectedRowKeys.includes(item.resourceId));
    onAssignedItemsChange(remaining);
    setSelectedRowKeys([]);
  };

  return (
    <Card
      title={title}
      extra={
        <div className="flex gap-2">
          <Button icon={<Plus className="h-4 w-4" />} onClick={handleOpenDrawer}>
            추가
          </Button>
          <Button icon={<Minus className="h-4 w-4" />} onClick={handleRemoveSelected} disabled={selectedRowKeys.length === 0} danger>
            선택 삭제
          </Button>
        </div>
      }
      className="shadow-sm"
      styles={{ header: { borderBottom: '1px solid #f0f0f0' }, body: { padding: '16px' } }}
      style={{ marginBottom: '50px' }}
    >
      {/* 할당된 리소스 테이블 */}
      <Table<AssignedResource>
        rowKey="resourceId"
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
        }}
        columns={columns}
        dataSource={assignedItems}
        pagination={false}
        size="small"
        loading={loading}
        locale={{ emptyText: `등록된 ${title}이(가) 없습니다.` }}
      />

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
