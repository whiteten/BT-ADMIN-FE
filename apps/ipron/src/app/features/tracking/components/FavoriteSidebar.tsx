/**
 * 트래킹 검색 즐겨찾기 사이드바 — AntD Drawer (기존 IPRON Drawer 패턴 준수).
 *
 * 목록 + 인라인 신규/수정 폼을 한 Drawer 안에 노출.
 * mutation 은 직접 favoriteApi 호출 (React 19 + MFE 에서 useMutation invalidateQueries 충돌 회피).
 */
import { useState } from 'react';
import { Button, Drawer, Empty, Form, Input, Modal, Switch, Tag } from 'antd';
import { Edit3, Plus, Star, Trash2, Users } from 'lucide-react';
import { toast } from '@/shared-util';
import { type FavoriteRequest, type TrackingFavorite, favoriteApi } from '../api/favoriteApi';
import { useGetFavorites } from '../hooks/useFavoriteQueries';

interface Props {
  open: boolean;
  onClose: () => void;
  currentCriteriaJson?: string | null;
  onApply?: (criteriaJson: string | null) => void;
}

interface FormValues {
  name: string;
  shareTeam: boolean;
}

const EMPTY_FORM: FormValues = { name: '', shareTeam: false };

export default function FavoriteSidebar({ open, onClose, currentCriteriaJson, onApply }: Props) {
  const listQ = useGetFavorites();
  const [form] = Form.useForm<FormValues>();
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<TrackingFavorite | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [pendingCriteriaJson, setPendingCriteriaJson] = useState<string | null>(null);

  const items = listQ.data ?? [];
  const myItems = items.filter((f) => f.mine);
  const teamItems = items.filter((f) => !f.mine);

  const openCreate = () => {
    if (!currentCriteriaJson) {
      toast.warning('먼저 검색 조건을 입력하세요');
      return;
    }
    setEditing(null);
    setPendingCriteriaJson(currentCriteriaJson);
    form.setFieldsValue(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (f: TrackingFavorite) => {
    setEditing(f);
    setPendingCriteriaJson(f.criteriaJson);
    form.setFieldsValue({ name: f.name, shareTeam: f.isTeam === 'Y' });
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setPendingCriteriaJson(null);
    form.resetFields();
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setBusy(true);
      const req: FavoriteRequest = {
        name: values.name.trim(),
        criteriaJson: pendingCriteriaJson,
        isTeam: values.shareTeam ? 'Y' : 'N',
      };
      if (editing) {
        await favoriteApi.update(editing.favId, req);
        toast.success('수정되었습니다');
      } else {
        await favoriteApi.create(req);
        toast.success('저장되었습니다');
      }
      closeForm();
      listQ.refetch();
    } catch (e) {
      if (e instanceof Error) toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = (fav: TrackingFavorite) => {
    Modal.confirm({
      title: '즐겨찾기 삭제',
      content: `"${fav.name}" 을(를) 삭제할까요?`,
      okText: '삭제',
      okType: 'danger',
      cancelText: '취소',
      onOk: async () => {
        setBusy(true);
        try {
          await favoriteApi.remove(fav.favId);
          toast.success('삭제되었습니다');
          listQ.refetch();
        } catch (e) {
          if (e instanceof Error) toast.error(e.message);
        } finally {
          setBusy(false);
        }
      },
    });
  };

  const handleApply = (fav: TrackingFavorite) => {
    onApply?.(fav.criteriaJson);
    onClose();
  };

  return (
    <Drawer
      title={
        <span className="flex items-center gap-2">
          <Star className="size-4 text-amber-500 fill-amber-500" />
          검색 즐겨찾기
          <span className="text-[11px] text-gray-400 font-normal ml-1">{items.length}개</span>
        </span>
      }
      placement="right"
      width={360}
      open={open}
      onClose={onClose}
      styles={{ body: { padding: 16 } }}
    >
      {!formOpen && (
        <div className="mb-4 rounded-md border border-amber-300 bg-amber-50/60 p-3.5">
          <div className="flex items-center gap-2 mb-2">
            <Star className="size-4 text-amber-500 fill-amber-500" />
            <span className="text-[13px] font-semibold text-gray-800">현재 검색 조건 저장</span>
          </div>
          <p className="text-[11.5px] text-gray-600 mb-2.5 leading-relaxed">
            {currentCriteriaJson ? '지금 입력된 검색 조건을 즐겨찾기로 등록합니다.' : '먼저 트래킹 검색 페이지에서 검색 조건을 입력하세요.'}
          </p>
          <Button type="primary" icon={<Plus className="size-3.5" />} onClick={openCreate} disabled={!currentCriteriaJson} block>
            즐겨찾기로 저장
          </Button>
        </div>
      )}

      {formOpen ? (
        <div className="rounded-md border border-[#405189] bg-blue-50/30 p-3 mb-4">
          <div className="text-[12px] font-semibold text-[#405189] mb-3">{editing ? '✎ 즐겨찾기 수정' : '＋ 새 즐겨찾기'}</div>
          <Form form={form} layout="vertical" size="small" requiredMark={false}>
            <Form.Item
              name="name"
              label="이름"
              rules={[
                { required: true, message: '이름을 입력하세요' },
                { max: 100, message: '100자 이내' },
              ]}
            >
              <Input autoFocus placeholder="예: 오늘 IVR 포기콜" maxLength={100} />
            </Form.Item>
            <Form.Item name="shareTeam" label="공유 (테넌트 내)" valuePropName="checked">
              <Switch checkedChildren="Y" unCheckedChildren="N" />
            </Form.Item>
            {pendingCriteriaJson && (
              <div className="bg-gray-50 border border-gray-200 rounded p-2 text-[10.5px] font-mono text-gray-600 max-h-24 overflow-auto mb-2">{pendingCriteriaJson}</div>
            )}
            <div className="flex gap-2">
              <Button type="primary" loading={busy} onClick={handleSave} block>
                {editing ? '수정' : '저장'}
              </Button>
              <Button onClick={closeForm} disabled={busy}>
                취소
              </Button>
            </div>
          </Form>
        </div>
      ) : null}

      {listQ.isLoading ? (
        <div className="text-center text-[12px] text-gray-400 py-8">불러오는 중...</div>
      ) : items.length === 0 && !formOpen ? (
        <Empty description="저장된 즐겨찾기가 없습니다" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <>
          {myItems.length > 0 && (
            <div className="mb-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2 px-1">내 즐겨찾기 ({myItems.length})</div>
              <ul className="space-y-1.5 list-none p-0 m-0">
                {myItems.map((f) => (
                  <FavoriteItem key={f.favId} fav={f} onApply={() => handleApply(f)} onEdit={() => openEdit(f)} onDelete={() => handleDelete(f)} />
                ))}
              </ul>
            </div>
          )}
          {teamItems.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2 px-1 flex items-center gap-1">
                <Users className="size-2.5" />
                공유 ({teamItems.length})
              </div>
              <ul className="space-y-1.5 list-none p-0 m-0">
                {teamItems.map((f) => (
                  <FavoriteItem key={f.favId} fav={f} onApply={() => handleApply(f)} />
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </Drawer>
  );
}

function FavoriteItem({ fav, onApply, onEdit, onDelete }: { fav: TrackingFavorite; onApply: () => void; onEdit?: () => void; onDelete?: () => void }) {
  return (
    <li className="group rounded-md border border-gray-200 bg-white hover:border-[#405189] hover:shadow-sm transition-all p-2.5">
      <div className="flex items-start gap-2">
        <button type="button" className="flex-1 min-w-0 text-left cursor-pointer bg-transparent border-0 p-0" onClick={onApply}>
          <div className="flex items-center gap-1.5">
            <Star className="size-3.5 text-amber-500 fill-amber-500 flex-shrink-0" />
            <span className="text-[13px] font-medium text-gray-900 truncate">{fav.name}</span>
            {fav.isTeam === 'Y' && (
              <Tag color="blue" style={{ margin: 0, padding: '0 6px', fontSize: 10, lineHeight: '16px' }}>
                <Users className="size-2.5 inline mr-0.5" />
                공유
              </Tag>
            )}
          </div>
          {fav.updatedAt && <div className="text-[10.5px] text-gray-400 mt-0.5 ml-5">{new Date(fav.updatedAt).toLocaleString('ko-KR')}</div>}
        </button>
        {fav.mine && onEdit && onDelete && (
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button type="text" size="small" icon={<Edit3 className="size-3" />} onClick={onEdit} title="수정" />
            <Button type="text" size="small" danger icon={<Trash2 className="size-3" />} onClick={onDelete} title="삭제" />
          </div>
        )}
      </div>
    </li>
  );
}
