import { useNavigate } from 'react-router-dom';
import { Button, Card, Empty, Spin, Tag } from 'antd';
import { Edit, Eye, LayoutDashboard, Plus, Trash2, Users } from 'lucide-react';
import { toast } from '@/shared-util';
import { useDeleteBoard, useGetBoardList } from '../../features/board/hooks/useBoardQueries';

export default function BoardListPage() {
  const navigate = useNavigate();
  const { data: boards = [], isLoading, refetch } = useGetBoardList({});
  const deleteMutation = useDeleteBoard({});

  const handleDelete = (boardId: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    deleteMutation.mutate(
      { boardId },
      {
        onSuccess: () => {
          toast.success('대시보드가 삭제되었습니다');
          refetch();
        },
        onError: () => toast.error('삭제에 실패했습니다'),
      },
    );
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <LayoutDashboard size={22} />
            대시보드 관리
          </h2>
          <p className="text-sm text-gray-500 mt-1">위젯을 배치하여 대시보드를 구성합니다</p>
        </div>
        <Button type="primary" icon={<Plus size={16} />} onClick={() => navigate('/dashboard/boards/new')}>
          새 대시보드
        </Button>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Spin size="large" />
        </div>
      ) : boards.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <Empty description="등록된 대시보드가 없습니다">
            <Button type="primary" onClick={() => navigate('/dashboard/boards/new')}>
              대시보드 만들기
            </Button>
          </Empty>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {boards.map((board) => (
            <Card key={board.boardId} hoverable className="cursor-pointer" onClick={() => navigate(`/dashboard/boards/${board.boardId}`)}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-medium truncate">{board.boardName}</h3>
                    {board.isSystem && <Tag color="default">시스템</Tag>}
                    {board.isShared && (
                      <Tag color="blue" icon={<Users size={10} />}>
                        공유
                      </Tag>
                    )}
                  </div>
                  {board.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{board.description}</p>}
                  <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
                    <span>위젯 {board.widgets?.length || 0}개</span>
                    <span>{board.createdBy}</span>
                    <span>{board.createdAt?.slice(0, 10)}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t" onClick={(e) => e.stopPropagation()}>
                <Button size="small" icon={<Eye size={12} />} onClick={() => navigate(`/dashboard/boards/${board.boardId}`)}>
                  보기
                </Button>
                <Button size="small" icon={<Edit size={12} />} onClick={() => navigate(`/dashboard/boards/${board.boardId}/edit`)} disabled={board.isSystem}>
                  편집
                </Button>
                <Button size="small" danger icon={<Trash2 size={12} />} onClick={() => handleDelete(board.boardId)} disabled={board.isSystem}>
                  삭제
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
