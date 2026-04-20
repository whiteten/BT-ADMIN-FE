import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { type BreadcrumbProps, Button, Input } from 'antd';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import KnowledgeCard from '../../features/agent-config/components/KnowledgeCard';
import { knowledgeQueryKeys, useDeleteKnowledge, useGetKnowledges } from '../../features/agent-config/hooks/useKnowledgeQueries';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import NoData from '@/components/custom/NoData';
import PageHeader from '@/components/custom/PageHeader';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '관리', path: '/aoe/agent-config' },
  { title: '지식', path: '/aoe/agent-config/knowledge/list' },
  { title: '지식 목록', path: '/aoe/agent-config/knowledge/list' },
];

export default function KnowledgeList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const modal = useModal();
  const [searchValue, setSearchValue] = useState('');

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

  const filteredList = useMemo(() => {
    if (!knowledges) return [];
    if (!searchValue.trim()) return knowledges;
    const keyword = searchValue.toLowerCase();
    return knowledges.filter((k) => k.documentName.toLowerCase().includes(keyword));
  }, [knowledges, searchValue]);

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
      <PageHeader breadcrumb={breadcrumb} />
      <div className="flex items-center justify-between gap-2 w-full h-[76px] bg-white bt-shadow px-7 py-5">
        <Input value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="w-full max-w-[400px]" placeholder="지식명을 입력하세요." />
        <Button type="primary" onClick={handleClickCreateBtn}>
          추가
        </Button>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center w-full h-full bg-white bt-shadow">
          <FallbackSpinner />
        </div>
      ) : filteredList.length ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(350px,1fr))] gap-4 w-full overflow-y-auto">
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
