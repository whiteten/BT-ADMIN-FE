/**
 * 시나리오별 메뉴관리 - 메뉴 수정 Drawer (AS-IS IPR20S6050 더블클릭 수정 팝업, IPR20S6050U.do).
 * AS-IS 팝업과 동일하게 시나리오명/상위메뉴명/버전/메뉴ID/메뉴깊이/정렬순서는 읽기 전용으로 함께 보여주고,
 * 메뉴명/주요서비스/보이기(visibleYn)만 편집 가능하다. PRIOR_MENU_ID/SORT_SEQ/MENU_FILTER 자체는
 * 이 화면의 편집 대상이 아니다. 현재 보고 있는 버전(serviceId+serviceVer+menuId)에만 적용된다.
 */
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Drawer, Form, type FormProps, Input, Radio } from 'antd';
import { toast } from '@/shared-util';
import { scenarioAnalysisQueryKeys, useUpdateScenarioAnalysisMenu } from '../hooks/useScenarioAnalysisQueries';
import type { ScenarioAnalysisMenuRow } from '../types';

export interface ScenarioAnalysisMenuEditTarget extends ScenarioAnalysisMenuRow {
  scenarioName: string | null;
  priorMenuName: string | null;
}

export interface ScenarioAnalysisMenuDrawerRef {
  open: (target: ScenarioAnalysisMenuEditTarget) => void;
  close: () => void;
}

interface DrawerState {
  open: boolean;
  target: ScenarioAnalysisMenuEditTarget | null;
}

interface MenuEditFormValues {
  menuName: string;
  visibleYn: number;
  majorYn: number;
}

const ON_OFF_OPTIONS = [
  { label: '설정', value: 1 },
  { label: '해제', value: 0 },
];

const ScenarioAnalysisMenuDrawer = forwardRef<ScenarioAnalysisMenuDrawerRef>((_, ref) => {
  const [state, setState] = useState<DrawerState>({ open: false, target: null });
  const [form] = Form.useForm<MenuEditFormValues>();
  const queryClient = useQueryClient();
  const { target } = state;

  const handleClose = () => setState((prev) => ({ ...prev, open: false }));

  useImperativeHandle(ref, () => ({
    open: (nextTarget) => setState({ open: true, target: nextTarget }),
    close: handleClose,
  }));

  useEffect(() => {
    if (!state.open || !target) return;
    form.setFieldsValue({
      menuName: target.menuName ?? '',
      visibleYn: target.visibleYn === 1 ? 1 : 0,
      majorYn: target.majorYn === 1 ? 1 : 0,
    });
    return () => form.resetFields();
  }, [state.open, target, form]);

  const { mutate: updateMenu, isPending } = useUpdateScenarioAnalysisMenu({
    mutationOptions: {
      onSuccess: () => {
        toast.success('메뉴 정보가 저장되었습니다.');
        queryClient.invalidateQueries({ queryKey: scenarioAnalysisQueryKeys.getMenus._def });
        handleClose();
      },
    },
  });

  const onFinish: FormProps<MenuEditFormValues>['onFinish'] = (values) => {
    if (!target) return;
    updateMenu({
      serviceId: target.serviceId,
      serviceVer: target.serviceVer,
      menuId: target.menuId,
      menuName: values.menuName,
      visibleYn: values.visibleYn,
      majorYn: values.majorYn,
    });
  };

  const onFinishFailed: FormProps<MenuEditFormValues>['onFinishFailed'] = (errorInfo) => {
    const firstError = errorInfo.errorFields?.[0]?.errors?.[0];
    toast.error(firstError ?? '입력 항목을 확인해주세요.');
  };

  return (
    <Drawer
      title={target ? `메뉴 수정 — ${target.menuName ?? target.menuId}` : '메뉴 수정'}
      open={state.open}
      onClose={handleClose}
      closable={{ placement: 'end', disabled: isPending }}
      styles={{ wrapper: { width: 480 } }}
      destroyOnHidden
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button onClick={handleClose}>취소</Button>
          <Button type="primary" onClick={() => form.submit()} loading={isPending}>
            저장
          </Button>
        </div>
      }
    >
      <Form form={form} layout="vertical" onFinish={onFinish} onFinishFailed={onFinishFailed}>
        <Form.Item label="시나리오명">
          <Input value={target?.scenarioName ?? '-'} disabled />
        </Form.Item>

        <div className="grid grid-cols-2 gap-x-3">
          <Form.Item label="상위메뉴명">
            <Input value={target?.priorMenuName ?? '-'} disabled />
          </Form.Item>
          <Form.Item label="버전">
            <Input value={target?.serviceVer ?? '-'} disabled />
          </Form.Item>
        </div>

        <div className="grid grid-cols-2 gap-x-3">
          <Form.Item label="메뉴ID">
            <Input value={target?.menuId ?? '-'} disabled />
          </Form.Item>
          <Form.Item name="menuName" label="메뉴명" required hasFeedback rules={[{ required: true, message: '메뉴명을 입력하세요.' }]}>
            <Input placeholder="메뉴명을 입력하세요." />
          </Form.Item>
        </div>

        <div className="grid grid-cols-2 gap-x-3">
          <Form.Item label="메뉴깊이">
            <Input value={target?.menuDepth ?? '-'} disabled />
          </Form.Item>
          <Form.Item label="정렬순서">
            <Input value={target?.sortSeq ?? '-'} disabled />
          </Form.Item>
        </div>

        <div className="grid grid-cols-2 gap-x-3">
          <Form.Item name="majorYn" label="주요서비스" required rules={[{ required: true, message: '주요서비스 여부를 선택하세요.' }]}>
            <Radio.Group options={ON_OFF_OPTIONS} optionType="button" buttonStyle="solid" />
          </Form.Item>
          <Form.Item name="visibleYn" label="보이기" required rules={[{ required: true, message: '보이기 여부를 선택하세요.' }]}>
            <Radio.Group options={ON_OFF_OPTIONS} optionType="button" buttonStyle="solid" />
          </Form.Item>
        </div>
      </Form>
    </Drawer>
  );
});
ScenarioAnalysisMenuDrawer.displayName = 'ScenarioAnalysisMenuDrawer';
export default ScenarioAnalysisMenuDrawer;
