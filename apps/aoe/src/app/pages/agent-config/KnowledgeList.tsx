import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { type BreadcrumbProps, Button, Input, Select } from 'antd';
import { Log } from '@/log';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import KnowledgeCard from '../../features/agent-config/components/KnowledgeCard';
import { knowledgeQueryKeys, useDeleteKnowledge, useGetKnowledges } from '../../features/agent-config/hooks/useKnowledgeQueries';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import NoData from '@/components/custom/NoData';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '관리', path: '/aoe/agent-config' },
  { title: '지식', path: '/aoe/agent-config/knowledge/list' },
  { title: '지식 목록', path: '/aoe/agent-config/knowledge/list' },
];

const FILTER_OPTIONS = [{ label: '지식명', value: 'documentName' }];

export default function KnowledgeList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const modal = useModal();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  const [filterColumn, setFilterColumn] = useState('documentName');
  const [searchValue, setSearchValue] = useState('');

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const { data: knowledges, isLoading } = useGetKnowledges({});

  const { mutate: deleteKnowledge } = useDeleteKnowledge({
    mutationOptions: {
      onSuccess: () => {
        toast.success('지식이 삭제되었습니다.');
        queryClient.invalidateQueries({ queryKey: knowledgeQueryKeys.getKnowledges().queryKey });
      },
      onError: (error) => {
        Log.warn('deleteKnowledge failed', error);
        toast.error('지식 삭제에 실패했습니다.');
      },
    },
  });

  const knowledgeList = knowledges ?? [];
  const filteredList = searchValue.trim()
    ? knowledgeList.filter((k) => {
        const value = k[filterColumn as keyof typeof k];
        if (value == null) return false;
        return String(value).toLowerCase().includes(searchValue.toLowerCase());
      })
    : knowledgeList;

  const handleColumnChange = (value: string) => {
    setFilterColumn(value);
    setSearchValue('');
  };

  const handleDetail = (documentId: string) => {
    navigate(`../${documentId}`);
  };

  const handleDelete = (documentId: string) => {
    modal.confirm.delete({ onOk: () => deleteKnowledge(documentId) });
  };

  const handleClickCreateBtn = () => {
    navigate('../create');
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex items-center justify-between gap-2 w-full h-[76px] bg-white bt-shadow px-7 py-5">
        <div className="flex gap-2 w-full items-center">
          <Select value={filterColumn} onChange={handleColumnChange} options={FILTER_OPTIONS} className="!max-w-[150px] !min-w-[120px]" popupMatchSelectWidth={false} />
          <Input value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="w-full max-w-[400px]" placeholder="검색어를 입력하세요." />
        </div>
        <Button type="primary" onClick={handleClickCreateBtn}>
          추가
        </Button>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center w-full h-full bg-white bt-shadow">
          <FallbackSpinner />
        </div>
      ) : filteredList.length ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(350px,1fr))] gap-4 w-full overflow-y-auto pt-2 -mt-2">
          {filteredList.map((knowledge) => (
            <KnowledgeCard key={knowledge.documentId} {...knowledge} onDetail={handleDetail} onDelete={handleDelete} />
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center w-full h-full bg-white bt-shadow">
          <NoData message="조회된 데이터가 없습니다." iconSize={50} fontSize="text-lg" gap={2} />
        </div>
      )}
    </div>
  );
}
