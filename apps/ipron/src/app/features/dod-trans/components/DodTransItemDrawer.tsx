/**
 * DOD DNIS 변환 아이템 등록/수정 Drawer
 * forwardRef + useImperativeHandle 패턴
 *
 * 번호패턴 선택 시 NumPatternDrawer (did-trans 공통) 사용
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Button, Drawer, Form, Input, InputNumber, Radio, Select } from 'antd';
import { List } from 'lucide-react';
import { toast } from '@/shared-util';
import NumPatternDrawer, { type NumPatternDrawerRef } from '../../did-trans/components/NumPatternDrawer';
import { useCreateItem, useDeleteItem, useUpdateItem } from '../hooks/useDodTransQueries';
import { type DodTransItem, EDIT_OPT_OPTIONS, TRANS_YN_OPTIONS } from '../types';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

export interface DodTransItemDrawerRef {
  open: (data?: DodTransItem, dodTransId?: number) => void;
  close: () => void;
}

interface Props {
  onSuccess: () => void;
}

const DodTransItemDrawer = forwardRef<DodTransItemDrawerRef, Props>(({ onSuccess }, ref) => {
  const [form] = Form.useForm();
  const modal = useModal();
  const numPatternDrawerRef = useRef<NumPatternDrawerRef>(null);
  const [visible, setVisible] = useState(false);
  const [patternMode, setPatternMode] = useState(false);
  const [editData, setEditData] = useState<DodTransItem | null>(null);
  const [dodTransId, setDodTransId] = useState<number | null>(null);

  const isEditMode = !!editData;

  useImperativeHandle(ref, () => ({
    open: (data?: DodTransItem, initDodTransId?: number) => {
      setEditData(data ?? null);
      setDodTransId(data?.dodTransId ?? initDodTransId ?? null);
      setVisible(true);
    },
    close: () => {
      setVisible(false);
      setEditData(null);
      setDodTransId(null);
      form.resetFields();
    },
  }));

  useEffect(() => {
    if (visible && editData) {
      form.setFieldsValue({
        numPattern: editData.numPattern,
        editOpt: editData.editOpt,
        delCount: editData.delCount,
        addDigit: editData.addDigit ?? '',
        transYn: editData.transYn,
      });
    } else if (visible) {
      form.resetFields();
    }
  }, [visible, editData, form]);

  // ─── Mutations ──────────────────────────────────────────────────────────────
  const { mutate: createItem, isPending: isCreating } = useCreateItem({
    mutationOptions: {
      onSuccess: () => {
        toast.success('변환 패턴이 등록되었습니다');
        handleClose();
        onSuccess();
      },
    },
  });

  const { mutate: updateItem, isPending: isUpdating } = useUpdateItem({
    mutationOptions: {
      onSuccess: () => {
        toast.success('변환 패턴이 수정되었습니다');
        handleClose();
        onSuccess();
      },
    },
  });

  const { mutate: deleteItem, isPending: isDeleting } = useDeleteItem({
    mutationOptions: {
      onSuccess: () => {
        toast.success('변환 패턴이 삭제되었습니다');
        handleClose();
        onSuccess();
      },
    },
  });

  const isPending = isCreating || isUpdating || isDeleting;

  const handleClose = useCallback(() => {
    setVisible(false);
    setEditData(null);
    setDodTransId(null);
    form.resetFields();
  }, [form]);

  const handleSubmit = useCallback(async () => {
    try {
      const values = await form.validateFields();

      if (isEditMode && editData) {
        updateItem({
          dodTransId: editData.dodTransId,
          listSeq: editData.listSeq,
          data: {
            numPattern: values.numPattern,
            editOpt: values.editOpt,
            delCount: values.delCount ?? 0,
            addDigit: values.addDigit || null,
            transYn: values.transYn,
          },
        });
      } else {
        if (!dodTransId) {
          toast.error('DOD DNIS 변환을 선택하세요');
          return;
        }
        createItem({
          dodTransId,
          numPattern: values.numPattern,
          editOpt: values.editOpt,
          delCount: values.delCount ?? 0,
          addDigit: values.addDigit || null,
          transYn: values.transYn,
        });
      }
    } catch {
      /* validation failed */
    }
  }, [form, isEditMode, editData, dodTransId, createItem, updateItem]);

  const handleDelete = useCallback(() => {
    if (!editData) return;
    modal.confirm.execute({
      onOk: () => deleteItem({ dodTransId: editData.dodTransId, listSeq: editData.listSeq }),
      options: {
        title: '변환 패턴 삭제',
        content: `"${editData.numPattern}" 패턴을 삭제하시겠습니까?`,
      },
    });
  }, [editData, modal, deleteItem]);

  return (
    <Drawer
      title={isEditMode ? '변환 패턴 수정' : '변환 패턴 등록'}
      open={visible}
      onClose={handleClose}
      closable={{ placement: 'end' }}
      styles={{ wrapper: { width: 420, display: patternMode ? 'none' : undefined } }}
      mask={!patternMode}
      footer={
        <div className="flex justify-between">
          <div>
            {isEditMode && (
              <Button danger onClick={handleDelete} loading={isDeleting}>
                삭제
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button onClick={handleClose}>취소</Button>
            <Button type="primary" onClick={handleSubmit} loading={isPending}>
              {isEditMode ? '수정' : '등록'}
            </Button>
          </div>
        </div>
      }
    >
      <Form form={form} layout="vertical" initialValues={{ editOpt: 1, delCount: 0, transYn: 1 }}>
        <Form.Item
          name="numPattern"
          label={
            <div className="flex items-center gap-1">
              <span>번호패턴</span>
              <Button
                type="text"
                size="small"
                icon={<List className="size-3.5" />}
                onClick={() => {
                  setPatternMode(true);
                  numPatternDrawerRef.current?.open();
                }}
                title="번호 패턴 관리"
                className="text-gray-400 hover:text-blue-500"
              />
            </div>
          }
          required
          rules={[
            { required: true, message: '번호패턴은 필수입니다' },
            { max: 256, message: '번호패턴은 256자 이내여야 합니다' },
          ]}
        >
          <Input placeholder="번호패턴을 입력하세요" maxLength={256} />
        </Form.Item>

        <Form.Item name="editOpt" label="편집옵션" rules={[{ required: true, message: '편집옵션은 필수입니다' }]}>
          <Select options={[...EDIT_OPT_OPTIONS]} placeholder="편집옵션을 선택하세요" />
        </Form.Item>

        <Form.Item name="delCount" label="Digit 수" rules={[{ required: true, message: 'Digit 수는 필수입니다' }]}>
          <InputNumber min={-1} max={99} placeholder="0" className="w-full" />
        </Form.Item>

        <Form.Item name="addDigit" label="추가 Digit" rules={[{ max: 24, message: '추가 Digit은 24자 이내여야 합니다' }]}>
          <Input placeholder="추가 Digit을 입력하세요" maxLength={24} />
        </Form.Item>

        <Form.Item name="transYn" label="변환 사용" rules={[{ required: true, message: '변환 사용 여부는 필수입니다' }]}>
          <Radio.Group>
            {TRANS_YN_OPTIONS.map((opt) => (
              <Radio key={opt.value} value={opt.value}>
                {opt.label}
              </Radio>
            ))}
          </Radio.Group>
        </Form.Item>
      </Form>

      <NumPatternDrawer
        ref={numPatternDrawerRef}
        onSelect={(pattern) => {
          form.setFieldsValue({ numPattern: pattern.numPattern });
          setPatternMode(false);
        }}
        onClose={() => setPatternMode(false)}
      />
    </Drawer>
  );
});

DodTransItemDrawer.displayName = 'DodTransItemDrawer';
export default DodTransItemDrawer;
