import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import TemplateWidgetEditor, { type TemplateWidgetEditorSaveDatas } from '../../features/monitoring/components/widget/TemplateWidgetEditor';
import { templateWidgetKeys, useCreateTemplateWidget, useGetTemplateWidget, useUpdateTemplateWidget } from '../../features/monitoring/hooks/useTemplateWidgetQueries';
import type { DomainCode } from '../../features/monitoring/types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

/**
 * 재사용 템플릿 위젯 빌더 — 등록/수정 공용. 대시보드와 무관한 독립 정의.
 * 3분할 단일 화면 편집기(TemplateWidgetEditor)로 데이터셋·노출 필드·시각화별 구성을 한 화면에서 편집.
 */
export default function TemplateWidgetBuilder() {
  const { templateWidgetId: param } = useParams<{ templateWidgetId: string }>();
  const editId = param ? Number(param) : undefined;
  const isEdit = editId != null;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  // TODO 템플릿 위젯 도메인 UX — 데이터셋에서 도메인 개념이 제거되어 더 이상 데이터셋에서 가져올 수 없음.
  //   빌더에 도메인 선택 UI를 추가하는 작업은 별도. 현재는 컴파일·저장 유지를 위한 임시 기본값.
  const selectedDomain: DomainCode = 'IC';

  // 편집 모드 — 기존 정의 prefill
  const { data: detail, isLoading: isDetailLoading } = useGetTemplateWidget({
    params: { templateWidgetId: editId ?? 0 },
    queryOptions: { enabled: isEdit, retry: false },
  });

  useEffect(() => {
    setBreadcrumb([
      { title: '모니터링', path: '/insight/monitoring' },
      { title: '위젯 관리', path: '/insight/monitoring/widgets' },
      { title: isEdit ? '템플릿 위젯 수정' : '새 템플릿 위젯', path: '/insight/monitoring/widgets/template/new' },
    ]);
    return () => clearBreadcrumb();
  }, [isEdit, setBreadcrumb, clearBreadcrumb]);

  const { mutate: runCreate, isPending: isCreating } = useCreateTemplateWidget({
    mutationOptions: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: templateWidgetKeys.list._def });
        toast.success('템플릿 위젯이 저장되었습니다.');
        navigate('/insight/monitoring/widgets');
      },
    },
  });
  const { mutate: runUpdate, isPending: isUpdating } = useUpdateTemplateWidget({
    mutationOptions: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: templateWidgetKeys.list._def });
        if (editId) queryClient.invalidateQueries({ queryKey: templateWidgetKeys.detail(editId).queryKey });
        toast.success('템플릿 위젯이 수정되었습니다.');
        navigate('/insight/monitoring/widgets');
      },
    },
  });

  const handleCancel = () => navigate('/insight/monitoring/widgets');

  const handleSave = (datas: TemplateWidgetEditorSaveDatas) => {
    const payload = {
      widgetName: datas.widgetName,
      domainCode: selectedDomain,
      datasetId: datas.datasetId,
      visualizations: datas.visualizations,
      defaultViz: datas.defaultViz,
      mapping: datas.mapping,
      refreshInterval: datas.refreshInterval,
      layoutW: datas.layoutW,
      layoutH: datas.layoutH,
    };
    if (isEdit && editId) runUpdate({ templateWidgetId: editId, data: payload });
    else runCreate(payload);
  };

  if (isEdit && isDetailLoading && !detail) return <FallbackSpinner />;

  const saving = isCreating || isUpdating;

  return (
    <div className="flex h-full w-full flex-col bg-[var(--color-bt-bg-canvas)]">
      <TemplateWidgetEditor
        initial={
          isEdit && detail
            ? {
                widgetName: detail.widgetName,
                datasetId: detail.datasetId,
                visualizations: detail.visualizations,
                defaultViz: detail.defaultViz,
                mapping: detail.mapping ?? {},
                refreshInterval: detail.refreshInterval ?? 3,
                layoutW: detail.layoutW,
                layoutH: detail.layoutH,
              }
            : undefined
        }
        onCancel={handleCancel}
        onSave={handleSave}
        saving={saving}
      />
    </div>
  );
}
