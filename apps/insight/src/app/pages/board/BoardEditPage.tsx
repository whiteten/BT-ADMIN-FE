import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, Empty, Form, Input, Select, Switch } from 'antd';
import { ArrowLeft, GripVertical, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from '@/shared-util';
import { useCreateBoard, useGetBoardDetail, useUpdateBoard } from '../../features/board/hooks/useBoardQueries';
import type { DashboardRequest, DashboardWidgetRequest } from '../../features/board/types/board.types';
import { useGetWidgetList } from '../../features/widget/hooks/useWidgetQueries';

export default function BoardEditPage() {
  const navigate = useNavigate();
  const { boardId } = useParams<{ boardId: string }>();
  const isEdit = !!boardId;
  const [form] = Form.useForm();
  const [widgets, setWidgets] = useState<DashboardWidgetRequest[]>([]);

  const createMutation = useCreateBoard({});
  const updateMutation = useUpdateBoard({});
  const { data: boardData } = useGetBoardDetail({
    params: isEdit ? { boardId: Number(boardId) } : undefined,
    queryOptions: { enabled: isEdit },
  });
  const { data: widgetList = [] } = useGetWidgetList({});

  useEffect(() => {
    if (boardData) {
      form.setFieldsValue({
        boardName: boardData.boardName,
        description: boardData.description,
        isShared: boardData.isShared,
      });
      setWidgets(
        boardData.widgets?.map((w) => ({
          widgetId: w.widgetId,
          layoutX: w.layoutX,
          layoutY: w.layoutY,
          layoutW: w.layoutW,
          layoutH: w.layoutH,
          viewMode: w.viewMode,
          sortOrder: w.sortOrder,
        })) || [],
      );
    }
  }, [boardData]);

  const addWidget = () => {
    setWidgets([
      ...widgets,
      {
        widgetId: 0,
        layoutX: 0,
        layoutY: widgets.length * 3,
        layoutW: 4,
        layoutH: 3,
        viewMode: 'grid',
        sortOrder: widgets.length,
      },
    ]);
  };

  const updateWidget = (index: number, key: keyof DashboardWidgetRequest, value: unknown) => {
    const updated = [...widgets];
    updated[index] = { ...updated[index], [key]: value };
    setWidgets(updated);
  };

  const removeWidget = (index: number) => {
    setWidgets(widgets.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    form.validateFields().then((values) => {
      const request: DashboardRequest = {
        ...values,
        widgets: widgets.filter((w) => w.widgetId > 0),
      };

      if (isEdit) {
        updateMutation.mutate(
          { params: { boardId: Number(boardId) }, data: request },
          {
            onSuccess: () => {
              toast.success('대시보드가 수정되었습니다');
              navigate('/dashboard/boards');
            },
            onError: () => toast.error('수정에 실패했습니다'),
          },
        );
      } else {
        createMutation.mutate(request, {
          onSuccess: () => {
            toast.success('대시보드가 생성되었습니다');
            navigate('/dashboard/boards');
          },
          onError: () => toast.error('생성에 실패했습니다'),
        });
      }
    });
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{isEdit ? '대시보드 편집' : '새 대시보드'}</h2>
          <p className="text-sm text-gray-500 mt-1">위젯을 선택하고 레이아웃을 설정합니다</p>
        </div>
        <div className="flex gap-2">
          <Button icon={<ArrowLeft size={14} />} onClick={() => navigate('/dashboard/boards')}>
            목록
          </Button>
          <Button type="primary" icon={<Save size={14} />} onClick={handleSave} loading={createMutation.isPending || updateMutation.isPending}>
            저장
          </Button>
        </div>
      </div>

      {/* 기본정보 */}
      <Card title="기본 정보" size="small">
        <Form form={form} layout="vertical" initialValues={{ isShared: false }}>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="boardName" label="대시보드명" rules={[{ required: true, message: '필수 입력' }]}>
              <Input placeholder="FCA 실시간 대시보드" />
            </Form.Item>
            <Form.Item name="isShared" label="공유" valuePropName="checked">
              <Switch />
            </Form.Item>
          </div>
          <Form.Item name="description" label="설명">
            <Input.TextArea rows={2} placeholder="대시보드 설명" />
          </Form.Item>
        </Form>
      </Card>

      {/* 위젯 배치 */}
      <Card
        title="위젯 배치"
        size="small"
        extra={
          <Button size="small" icon={<Plus size={14} />} onClick={addWidget}>
            위젯 추가
          </Button>
        }
      >
        {widgets.length === 0 ? (
          <Empty description="위젯을 추가하세요">
            <Button type="primary" size="small" onClick={addWidget}>
              위젯 추가
            </Button>
          </Empty>
        ) : (
          <div className="space-y-3">
            {widgets.map((w, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                <GripVertical size={16} className="text-gray-400 cursor-grab" />
                <Select
                  value={w.widgetId || undefined}
                  onChange={(v) => updateWidget(idx, 'widgetId', v)}
                  options={widgetList.map((wl) => ({
                    value: wl.widgetId,
                    label: `[${wl.category}] ${wl.widgetName}`,
                  }))}
                  placeholder="위젯 선택"
                  style={{ width: 280 }}
                />
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>X:</span>
                  <Input size="small" type="number" value={w.layoutX} onChange={(e) => updateWidget(idx, 'layoutX', Number(e.target.value))} style={{ width: 50 }} />
                  <span>Y:</span>
                  <Input size="small" type="number" value={w.layoutY} onChange={(e) => updateWidget(idx, 'layoutY', Number(e.target.value))} style={{ width: 50 }} />
                  <span>W:</span>
                  <Input size="small" type="number" value={w.layoutW} onChange={(e) => updateWidget(idx, 'layoutW', Number(e.target.value))} style={{ width: 50 }} />
                  <span>H:</span>
                  <Input size="small" type="number" value={w.layoutH} onChange={(e) => updateWidget(idx, 'layoutH', Number(e.target.value))} style={{ width: 50 }} />
                </div>
                <Select
                  value={w.viewMode}
                  onChange={(v) => updateWidget(idx, 'viewMode', v)}
                  options={[
                    { value: 'grid', label: '그리드' },
                    { value: 'chart', label: '차트' },
                    { value: 'card', label: '카드' },
                  ]}
                  style={{ width: 90 }}
                />
                <Button size="small" type="text" danger icon={<Trash2 size={14} />} onClick={() => removeWidget(idx)} />
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-gray-400 mt-3">* 드래그앤드롭 레이아웃 편집기는 추후 구현됩니다. 현재는 좌표를 직접 입력합니다.</p>
      </Card>
    </div>
  );
}
