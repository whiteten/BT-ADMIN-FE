/**
 * 내선 프로파일 등록/수정 폼 우측 요약 패널
 * Form.useWatch 값 또는 상위에서 전달된 formValues 를 구독하여 실시간 표시
 */
import { Divider } from 'antd';
import type { ProfileOptionItem } from '../types/dnProfile.types';
import { DN_PROFILE_TYPE_LABELS, NAT_OPTION_LABELS, ON_OFF_LABEL, YES_NO_LABEL, getRtpLabel } from '../utils/dnProfileEnums';

interface DnProfileSummaryPanelProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  values: any;
  nodes: { nodeId: number; nodeName: string }[];
  tenants: { tenantId: number; tenantName: string }[];
  options: {
    emergencyProfiles: ProfileOptionItem[];
    devfuncProfiles: ProfileOptionItem[];
    accessProfiles: ProfileOptionItem[];
    sipProfiles: ProfileOptionItem[];
    localRoutes: ProfileOptionItem[];
    msGroups: ProfileOptionItem[];
    mediaDeliveries: ProfileOptionItem[];
    recNotifyMents: ProfileOptionItem[];
    drProfiles: ProfileOptionItem[];
  };
}

const displayValue = (v: unknown) => (v !== null && v !== undefined && v !== '' ? String(v) : <span className="text-gray-300">-</span>);

const findName = (list: { id: number; name: string }[] | undefined, id: number | null | undefined): string | null => {
  if (!id || !list) return null;
  return list.find((o) => o.id === id)?.name ?? null;
};

export default function DnProfileSummaryPanel({ values, nodes, tenants, options }: DnProfileSummaryPanelProps) {
  const v = values ?? {};

  const nodeName = nodes.find((n) => n.nodeId === v.nodeId)?.nodeName ?? null;
  const tenantName = tenants.find((t) => t.tenantId === v.tenantId)?.tenantName ?? null;
  const drNodeName = nodes.find((n) => n.nodeId === v.drNodeId)?.nodeName ?? null;

  const emergencyName = findName(options.emergencyProfiles, v.emergencyCodeProfileId);
  const devfuncName = findName(options.devfuncProfiles, v.devfuncCodeProfileId);
  const accessName = findName(options.accessProfiles, v.accessCodeProfileId);
  const sipName = findName(options.sipProfiles, v.sipProfileId);
  const localRouteName = findName(options.localRoutes, v.localRouteId);
  const msGroupName = findName(options.msGroups, v.msGroupId);
  const mediaName = findName(options.mediaDeliveries, v.mediaDeliveryId);
  const recNotifyName = findName(options.recNotifyMents, v.recNotifyMentId);
  const drProfileName = findName(options.drProfiles, v.drDnProfileId);

  return (
    <div className="space-y-4 text-sm">
      {/* 1. 기본 */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">1. 기본 정보</div>
        <SummaryRow label="노드" value={displayValue(nodeName)} required />
        <SummaryRow label="테넌트" value={displayValue(tenantName)} required />
        <SummaryRow label="유형" value={displayValue(v.dnProfileType ? DN_PROFILE_TYPE_LABELS[v.dnProfileType as '0' | '1'] : null)} required />
        <SummaryRow label="프로파일명" value={displayValue(v.dnProfileName)} required />
      </div>

      <Divider className="!my-3" />

      {/* 2. DR */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">2. DR 설정</div>
        <SummaryRow label="DR 노드" value={displayValue(drNodeName)} />
        <SummaryRow label="Global DN" value={displayValue(ON_OFF_LABEL(v.globalDnYn))} />
        <SummaryRow label="DR 프로파일" value={displayValue(drProfileName)} />
      </div>

      <Divider className="!my-3" />

      {/* 3. 특수코드 */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">3. 특수코드</div>
        <SummaryRow label="긴급코드" value={displayValue(emergencyName)} required />
        <SummaryRow label="기능코드" value={displayValue(devfuncName)} required />
        <SummaryRow label="접근코드" value={displayValue(accessName)} required />
      </div>

      <Divider className="!my-3" />

      {/* 4. SIP / 라우트 / CTI */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">4. SIP / 라우트 / CTI</div>
        <SummaryRow label="SIP 프로파일" value={displayValue(sipName)} />
        <SummaryRow label="로컬라우트" value={displayValue(localRouteName)} />
        <SummaryRow label="CTI 사용" value={displayValue(YES_NO_LABEL(v.ctiUse))} />
      </div>

      <Divider className="!my-3" />

      {/* 5. 중개 / NAT */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">5. 중개 / NAT</div>
        <SummaryRow label="RTP 중개" value={displayValue(getRtpLabel(v.dnProfileType, v.rtpOption))} />
        <SummaryRow label="MS 그룹" value={displayValue(msGroupName)} />
        <SummaryRow label="NAT" value={displayValue(v.natOption ? NAT_OPTION_LABELS[v.natOption as '0' | '1' | '2' | '3' | '4'] : null)} />
        <SummaryRow label="미디어 전달" value={displayValue(mediaName)} />
        <SummaryRow label="녹취 안내 멘트" value={displayValue(recNotifyName)} />
        <SummaryRow label="녹취 시작 유형" value={displayValue(v.recStartCallType)} />
      </div>

      <Divider className="!my-3" />

      {/* 6. AGC */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">6. AGC 제어</div>
        <SummaryRow label="AGC 설정" value={displayValue(ON_OFF_LABEL(v.agcYn))} />
        {v.agcYn === true && (
          <>
            <SummaryRow label="기본 레벨" value={displayValue(v.agcDefLevel)} />
            <SummaryRow label="Gain 압축" value={displayValue(v.agcGainComp)} />
          </>
        )}
      </div>
    </div>
  );
}

function SummaryRow({ label, value, required }: { label: string; value: React.ReactNode; required?: boolean }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-gray-500 w-[110px] shrink-0">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      <span className="text-gray-800 font-medium flex-1 break-all">{value}</span>
    </div>
  );
}
