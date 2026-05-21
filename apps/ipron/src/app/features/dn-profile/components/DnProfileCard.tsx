/**
 * 내선 프로파일 카드 (XL 타입 — 220×190)
 *
 * Layout:
 *  ┌──────────────────────────────────────────┐
 *  │ [DN|TRUNK] {프로파일명}           [⋮]   │ h-header
 *  │ 노드   : {nodeName}                      │
 *  │ DR     : {drNodeName}                    │
 *  │ 긴급   : {emergencyProfileName}          │
 *  │ 기능   : {devfuncProfileName}            │
 *  │ 접근   : {accessProfileName}             │
 *  │                                          │
 *  │ [Global] [CTI]                           │ mt-auto 하단 태그
 *  └──────────────────────────────────────────┘
 */
import { Dropdown } from 'antd';
import { Copy, Edit3, ListPlus, MoreVertical, Trash2 } from 'lucide-react';
import type { DnProfile } from '../types';

interface DnProfileCardProps {
  profile: DnProfile;
  selected: boolean;
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  onEdit: (profile: DnProfile) => void;
  onCopy: (profile: DnProfile) => void;
  onDelete: (profile: DnProfile) => void;
  onAssignDns?: (profile: DnProfile) => void;
}

export default function DnProfileCard({ profile, selected, onClick, onEdit, onCopy, onDelete, onAssignDns }: DnProfileCardProps) {
  const isTrunk = profile.dnProfileType === '1';

  const menuItems = [
    { key: 'edit', label: '수정', icon: <Edit3 className="size-4" />, onClick: () => onEdit(profile) },
    // DN 배정 — 내선 프로파일만 지원. TRUNK 프로파일은 SIP 트렁크 화면 마이그레이션 이후 별도 구현 (TODO)
    ...(onAssignDns && !isTrunk
      ? [
          {
            key: 'assign-dns',
            label: 'DN 배정',
            icon: <ListPlus className="size-4" />,
            onClick: () => onAssignDns(profile),
          },
        ]
      : []),
    // TODO: 프로파일 복사 — 1차 마이그레이션 제외 (DN관리 마이그레이션 시 구현)
    { key: 'copy', label: '복사', icon: <Copy className="size-4" />, disabled: true, onClick: () => onCopy(profile) },
    { key: 'delete', label: '삭제', icon: <Trash2 className="size-4" />, danger: true, onClick: () => onDelete(profile) },
  ];

  return (
    <div
      id={`dn-profile-card-${profile.dnProfileId}`}
      className={`bg-white border rounded-lg p-4 cursor-pointer transition-all w-[220px] h-[190px] flex-shrink-0 flex flex-col ${
        selected ? 'border-[#405189] shadow-[0_0_0_2px_rgba(64,81,137,0.15)]' : 'border-gray-200 hover:border-[#c5cbe0] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
      }`}
      onClick={onClick}
      onDoubleClick={() => onEdit(profile)}
    >
      {/* Header: 유형 배지 + 이름 + 메뉴 */}
      <div className="flex items-center justify-between gap-1 mb-1">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border flex-shrink-0 ${
              isTrunk ? 'text-orange-700 bg-orange-50 border-orange-200' : 'text-blue-700 bg-blue-50 border-blue-200'
            }`}
          >
            {isTrunk ? 'TRUNK' : 'DN'}
          </span>
          <span className="text-sm font-semibold text-gray-800 truncate" title={profile.dnProfileName}>
            {profile.dnProfileName}
          </span>
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
            <button type="button" className="p-0.5 rounded hover:bg-gray-100 transition-colors flex-shrink-0">
              <MoreVertical className="size-3.5 text-gray-400" />
            </button>
          </Dropdown>
        </div>
      </div>

      {/* Info lines — 5줄 */}
      <div className="text-xs space-y-0.5 text-gray-600 mt-0.5 min-w-0">
        <InfoLine label="노드" value={profile.nodeName ?? '-'} />
        <InfoLine label="DR" value={profile.drNodeName ?? '미지정'} />
        <InfoLine label="긴급" value={profile.emergencyCodeProfileName ?? '-'} />
        <InfoLine label="기능" value={profile.devfuncCodeProfileName ?? '-'} />
        <InfoLine label="접근" value={profile.accessCodeProfileName ?? '-'} />
      </div>

      {/* 하단 상태 태그 — Global / CTI */}
      <div className="mt-auto pt-1.5 flex flex-wrap gap-1">
        {profile.globalDnYn ? <Tag color="green">Global</Tag> : <Tag color="gray">Local</Tag>}
        {profile.ctiUse && <Tag color="blue">CTI</Tag>}
        {profile.agcYn && <Tag color="purple">AGC</Tag>}
      </div>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1 min-w-0">
      <span className="text-gray-400 flex-shrink-0 w-[32px]">{label}</span>
      <span className="text-gray-700 truncate" title={value}>
        {value}
      </span>
    </div>
  );
}

function Tag({ color, children }: { color: 'green' | 'blue' | 'gray' | 'purple'; children: React.ReactNode }) {
  const colorClass =
    color === 'green'
      ? 'text-green-700 bg-green-50 border-green-200'
      : color === 'blue'
        ? 'text-blue-700 bg-blue-50 border-blue-200'
        : color === 'purple'
          ? 'text-purple-700 bg-purple-50 border-purple-200'
          : 'text-gray-500 bg-gray-50 border-gray-200';
  return <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${colorClass}`}>{children}</span>;
}
