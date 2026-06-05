/**
 * SIP 프로파일 목록 페이지 (카드 그리드)
 * - 검색 필터 + 카드 그리드 레이아웃
 * - 카드 클릭 → 폼 페이지 (수정)
 * - [프로파일 추가] → 폼 페이지 (등록)
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Dropdown, Empty, Input } from 'antd';
import { MoreVertical, Plus, Search } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { sipProfileQueryKeys, useDeleteSipProfile, useGetSipProfiles } from '../../features/sip-profile/hooks/useSipProfileQueries';
import { SS_REFRESH_TYPE_LABELS, type SipProfile, getActiveSipOptionTags } from '../../features/sip-profile/types';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [
  { title: 'IPRON', path: '/ipron' },
  { title: '번호자원관리', path: '/ipron/numbering' },
  { title: '프로파일', path: '/ipron/numbering/profile' },
  { title: 'SIP 프로파일', path: '/ipron/profile/sip-profile' },
];

export default function SipProfileList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const modal = useModal();

  // ─── State ──────────────────────────────────────────────────────────────────
  const [searchText, setSearchText] = useState('');

  // ─── Queries ──────────────────────────────────────────────────────────────
  const { data: profiles = [] } = useGetSipProfiles();

  // ─── Mutations ────────────────────────────────────────────────────────────
  const { mutate: deleteProfile } = useDeleteSipProfile({
    mutationOptions: {
      onSuccess: () => {
        toast.success('프로파일이 삭제되었습니다.');
        queryClient.invalidateQueries({ queryKey: sipProfileQueryKeys.getProfiles().queryKey });
      },
    },
  });

  // ─── Filtered data ────────────────────────────────────────────────────────
  const filteredProfiles = useMemo(() => {
    if (!searchText.trim()) return profiles;
    const keyword = searchText.toLowerCase();
    return profiles.filter((p) => p.sipProfileName.toLowerCase().includes(keyword));
  }, [profiles, searchText]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleCreate = useCallback(() => {
    navigate('create');
  }, [navigate]);

  const handleEdit = useCallback(
    (profile: SipProfile) => {
      navigate(`${profile.sipProfileId}`);
    },
    [navigate],
  );

  const handleDelete = useCallback(
    (profile: SipProfile) => {
      modal.confirm.execute({
        onOk: () => deleteProfile({ id: profile.sipProfileId }),
        options: {
          title: '프로파일 삭제',
          content: `"${profile.sipProfileName}" 프로파일을 삭제하시겠습니까?`,
        },
      });
    },
    [modal, deleteProfile],
  );

  const getCardMenuItems = (profile: SipProfile) => [
    {
      key: 'edit',
      label: '수정',
      onClick: () => handleEdit(profile),
    },
    {
      key: 'delete',
      label: '삭제',
      danger: true,
      onClick: () => handleDelete(profile),
    },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 w-full h-[56px] bg-white bt-shadow px-5 flex-shrink-0">
        <div className="flex gap-3 items-center">
          <Input
            placeholder="프로파일명 검색"
            prefix={<Search className="size-4 text-gray-400" />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            style={{ width: 240 }}
          />
          <span className="text-sm text-gray-500">{filteredProfiles.length}건</span>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate('header-manage')}>헤더 관리</Button>
          <Button type="primary" icon={<Plus className="size-4" />} onClick={handleCreate}>
            프로파일 추가
          </Button>
        </div>
      </div>

      {/* Card Grid */}
      <div className="flex-1 bg-white bt-shadow overflow-y-auto">
        {filteredProfiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3 px-8 py-16">
            <Empty description={false} />
            <span className="text-sm">{searchText ? '검색 결과가 없습니다' : '등록된 프로파일이 없습니다'}</span>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3 p-5">
            {filteredProfiles.map((profile) => {
              const tags = getActiveSipOptionTags(profile.sipOption);
              return (
                <div
                  key={profile.sipProfileId}
                  className="bg-white border border-gray-200 rounded-md p-4 cursor-pointer transition-all hover:border-[#405189] hover:shadow-[0_2px_8px_rgba(64,81,137,0.12)]"
                  onClick={() => handleEdit(profile)}
                >
                  {/* Card header */}
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                      <span className="w-2 h-2 rounded-full bg-[#405189] flex-shrink-0" />
                      <span className="truncate">{profile.sipProfileName}</span>
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <Dropdown menu={{ items: getCardMenuItems(profile) }} trigger={['click']} placement="bottomRight">
                        <button type="button" className="p-1 rounded hover:bg-gray-100 transition-colors">
                          <MoreVertical className="size-4 text-gray-500" />
                        </button>
                      </Dropdown>
                    </div>
                  </div>

                  {/* Card info */}
                  <div className="text-xs text-gray-500 mb-1">헤더그룹: {profile.sipHeaderGrpName || '없음'}</div>
                  <div className="text-xs text-gray-500 mb-1">
                    세션갱신: {SS_REFRESH_TYPE_LABELS[profile.ssRefreshType] ?? profile.ssRefreshType} | {profile.ssRefreshInterval}초
                  </div>

                  {/* Tags */}
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2.5">
                      {tags.map((tag) => (
                        <span key={tag} className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] bg-blue-50 text-blue-600 border border-blue-200">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
