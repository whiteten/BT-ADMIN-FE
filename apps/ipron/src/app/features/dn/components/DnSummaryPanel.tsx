/**
 * DN 등록/수정 폼 우측 요약 패널
 * Form.useWatch / 상위 formValues 구독하여 실시간 표시
 *
 * Step 1 기본/IP, Step 2 인증/단말기, Step 3 부가설정/IPT 그룹핑.
 */
import { Divider } from 'antd';
import type { DnOptionItem } from '../types';
import {
  ADN_DEFAULT_STATE_LABELS,
  BOOL_ON_OFF_LABEL,
  BOOL_OX_LABEL,
  DN_STATUS_LABELS,
  DN_TYPE_LABELS,
  EXT_AUTH_TYPE_LABELS,
  IP_VERSION_LABELS,
  TRANSPORT_TYPE_LABELS,
} from '../utils/dnEnums';

interface DnSummaryPanelProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  values: any;
  nodes: { nodeId: number; nodeName: string }[];
  tenants: { tenantId: number; tenantName: string }[];
  options: {
    dnProfiles: DnOptionItem[];
    cos: DnOptionItem[];
    deviceTypes: DnOptionItem[];
    pickupGrps: DnOptionItem[];
    dodLimits: DnOptionItem[];
    origGrpdns: DnOptionItem[];
    rbMents: DnOptionItem[];
    mohMents: DnOptionItem[];
    coRbMents: DnOptionItem[];
    coMohMents: DnOptionItem[];
    mediaDeliveries: DnOptionItem[];
    msGroups: DnOptionItem[];
    drNodes: DnOptionItem[];
  };
}

const displayValue = (v: unknown) => (v !== null && v !== undefined && v !== '' ? String(v) : <span className="text-gray-300">-</span>);

const findName = (list: DnOptionItem[] | undefined, id: number | null | undefined): string | null => {
  if (!id || !list) return null;
  return list.find((o) => o.id === id)?.name ?? null;
};

export default function DnSummaryPanel({ values, nodes, tenants, options }: DnSummaryPanelProps) {
  const v = values ?? {};

  const nodeName = nodes.find((n) => n.nodeId === v.nodeId)?.nodeName ?? null;
  const tenantName = tenants.find((t) => t.tenantId === v.tenantId)?.tenantName ?? null;
  const drNodeName = findName(options.drNodes, v.backUpNodeId);

  const profileName = findName(options.dnProfiles, v.dnProfileId);
  const cosName = findName(options.cos, v.cosId);
  const deviceName = findName(options.deviceTypes, v.deviceType ? Number(v.deviceType) : null);
  const pickupName = findName(options.pickupGrps, v.pickupGrpId);
  const dodLimitName = findName(options.dodLimits, v.dodLimitId);
  const origGrpdnName = findName(options.origGrpdns, v.origGrpdnId);
  const rbMentName = findName(options.rbMents, v.rbMentId);
  const mohMentName = findName(options.mohMents, v.mohMentId);
  const mediaName = findName(options.mediaDeliveries, v.mediaDeliveryId);
  const msGroupName = findName(options.msGroups, v.msGroupId);

  // IP 주소 문자열
  const ipDisplay = v.ipVersion === '6' ? v.ipv6Address : v.ipv4Address;

  return (
    <div className="space-y-4 text-sm">
      {/* 1. 기본 */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">1. 기본 정보</div>
        <SummaryRow label="노드" value={displayValue(nodeName)} required />
        <SummaryRow label="테넌트" value={displayValue(tenantName)} required />
        <SummaryRow label="DN 번호" value={displayValue(v.dnNo)} required />
        <SummaryRow label="유형" value={displayValue(v.dnType ? DN_TYPE_LABELS[v.dnType as keyof typeof DN_TYPE_LABELS] : null)} required />
        <SummaryRow label="프로파일" value={displayValue(profileName)} required />
        <SummaryRow label="COS" value={displayValue(cosName)} />
      </div>

      <Divider className="!my-3" />

      {/* 2. IP / DR */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">2. IP / DR</div>
        <SummaryRow label="IP 버전" value={displayValue(v.ipVersion ? IP_VERSION_LABELS[v.ipVersion as '4' | '6'] : null)} />
        <SummaryRow label="IP 유형" value={displayValue(v.extAuthtype ? EXT_AUTH_TYPE_LABELS[v.extAuthtype as '1' | '2'] : null)} />
        <SummaryRow label="IP 주소" value={displayValue(ipDisplay)} />
        <SummaryRow label="포트 번호" value={displayValue(v.portNo)} />
        <SummaryRow label="IP 업데이트" value={displayValue(BOOL_ON_OFF_LABEL(v.extIpUpdate))} />
        <SummaryRow label="DR 노드" value={displayValue(drNodeName ?? (v.backUpNodeId ? '(선택됨)' : null))} />
        <SummaryRow label="Global DN" value={displayValue(BOOL_ON_OFF_LABEL(v.globalDnYn))} />
      </div>

      <Divider className="!my-3" />

      {/* 3. 인증 / 사용자 / 단말기 */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">3. 인증 / 단말기</div>
        <SummaryRow label="MD5 인증" value={displayValue(BOOL_ON_OFF_LABEL(v.md5Auth))} />
        {v.md5Auth === 1 && (
          <>
            <SummaryRow label="MD5 ID" value={displayValue(v.md5Authid)} />
            <SummaryRow label="MD5 PW" value={displayValue(v.md5Authpwd ? '••••••' : null)} />
          </>
        )}
        <SummaryRow label="전송유형" value={displayValue(v.transportType ? TRANSPORT_TYPE_LABELS[v.transportType as keyof typeof TRANSPORT_TYPE_LABELS] : null)} />
        <SummaryRow label="SRTP" value={displayValue(BOOL_ON_OFF_LABEL(v.srtpYn))} />
        <SummaryRow label="사용자명" value={displayValue(v.ieUserName)} />
        <SummaryRow label="상담원 기본상태" value={displayValue(v.adnDftState ? ADN_DEFAULT_STATE_LABELS[v.adnDftState as keyof typeof ADN_DEFAULT_STATE_LABELS] : null)} />
        <SummaryRow label="DN 상태" value={displayValue(v.dnStatus ? DN_STATUS_LABELS[v.dnStatus as '0' | '1'] : null)} />
        <SummaryRow label="단말기 유형" value={displayValue(deviceName)} />
        <SummaryRow label="MAC" value={displayValue(v.macAddress)} />
        <SummaryRow label="라인번호" value={displayValue(v.chnlIdx)} />
      </div>

      <Divider className="!my-3" />

      {/* 4. 부가 / IPT */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">4. 부가설정 / IPT</div>
        <SummaryRow label="호추적" value={displayValue(BOOL_OX_LABEL(v.traceYn))} />
        <SummaryRow label="내선블럭" value={displayValue(BOOL_OX_LABEL(v.extBlockYn))} />
        <SummaryRow label="SNR 사용" value={displayValue(BOOL_OX_LABEL(v.snrYn))} />
        <SummaryRow label="착신 금지" value={displayValue(BOOL_OX_LABEL(v.dnTblYn))} />
        <SummaryRow label="발신 금지" value={displayValue(BOOL_OX_LABEL(v.dnOblYn))} />
        <SummaryRow label="자동 미디어전달" value={displayValue(BOOL_OX_LABEL(v.autoMdYn))} />
        <SummaryRow label="자동응답" value={displayValue(BOOL_OX_LABEL(v.autoanswerYn))} />
        {v.autoanswerYn === 1 && <SummaryRow label="벨울림 횟수" value={displayValue(v.autoanswerBellCnt)} />}
        <SummaryRow label="지정 발신번호" value={displayValue(v.dodAni)} />
        <SummaryRow label="개별과금번호" value={displayValue(v.chrgAni)} />
        <SummaryRow label="내선간 발신" value={displayValue(v.internalAni)} />
        <SummaryRow label="픽업 그룹" value={displayValue(pickupName)} />
        <SummaryRow label="발신제한 그룹" value={displayValue(dodLimitName)} />
        <SummaryRow label="그룹 DN" value={displayValue(origGrpdnName)} />
        <SummaryRow label="기본 RB 멘트" value={displayValue(rbMentName)} />
        <SummaryRow label="기본 MOH 멘트" value={displayValue(mohMentName)} />
        <SummaryRow label="미디어 전달" value={displayValue(mediaName)} />
        <SummaryRow label="MS 그룹" value={displayValue(msGroupName)} />
      </div>
    </div>
  );
}

function SummaryRow({ label, value, required }: { label: string; value: React.ReactNode; required?: boolean }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-gray-500 w-[110px] shrink-0 text-xs">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      <span className="text-gray-800 font-medium flex-1 break-all text-xs">{value}</span>
    </div>
  );
}
