import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, Empty, Spin, Tag } from 'antd';
import { Edit, Maximize, RotateCcw } from 'lucide-react';
import { toast } from '@/shared-util';
import { useGetBoardDetail, useResetUserLayout } from '../../features/board/hooks/useBoardQueries';

export default function BoardViewPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const { data: board, isLoading } = useGetBoardDetail({
    params: { boardId: Number(boardId) },
    queryOptions: { enabled: !!boardId },
  });
  const resetLayoutMutation = useResetUserLayout({});

  const handleResetLayout = () => {
    if (!confirm('레이아웃을 초기화하시겠습니까? 사용자 설정이 삭제됩니다.')) return;
    resetLayoutMutation.mutate(
      { boardId: Number(boardId) },
      {
        onSuccess: () => toast.success('레이아웃이 초기화되었습니다'),
        onError: () => toast.error('초기화에 실패했습니다'),
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spin size="large" />
      </div>
    );
  }

  if (!board) {
    return (
      <div className="flex items-center justify-center h-full">
        <Empty description="대시보드를 찾을 수 없습니다" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full h-full p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{board.boardName}</h2>
          {board.description && <p className="text-sm text-gray-500 mt-1">{board.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-gray-500">실시간 연결됨</span>
          </div>
          <Button size="small" icon={<RotateCcw size={14} />} onClick={handleResetLayout}>
            레이아웃 초기화
          </Button>
          <Button size="small" icon={<Edit size={14} />} onClick={() => navigate(`/dashboard/boards/${boardId}/edit`)} disabled={board.isSystem}>
            편집
          </Button>
          <Button size="small" icon={<Maximize size={14} />}>
            전체화면
          </Button>
        </div>
      </div>

      {/* Widget Grid */}
      {board.widgets?.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <Empty description="배치된 위젯이 없습니다">
            <Button type="primary" onClick={() => navigate(`/dashboard/boards/${boardId}/edit`)}>
              위젯 배치하기
            </Button>
          </Empty>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-12 gap-3 auto-rows-[80px]">
          {board.widgets?.map((w) => (
            <Card
              key={w.id}
              size="small"
              className="overflow-hidden"
              style={{
                gridColumn: `span ${w.layoutW}`,
                gridRow: `span ${w.layoutH}`,
              }}
              title={
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{w.widget?.widgetName || `위젯 #${w.widgetId}`}</span>
                  {w.widget?.refreshMode === 'AUTO' && (
                    <Tag color="green" className="text-xs">
                      자동 {w.widget.refreshInterval}초
                    </Tag>
                  )}
                  {w.widget?.refreshMode === 'MANUAL' && <Tag className="text-xs">수동</Tag>}
                  {w.isUserOverridden && (
                    <Tag color="orange" className="text-xs">
                      커스텀
                    </Tag>
                  )}
                </div>
              }
              extra={<div className="flex items-center gap-1 text-xs text-gray-400">{w.viewMode}</div>}
            >
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                [{w.widget?.visualization || w.viewMode}] 위젯 데이터 영역
                <br />
                (WebSocket 연동 후 실제 데이터 렌더링)
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
