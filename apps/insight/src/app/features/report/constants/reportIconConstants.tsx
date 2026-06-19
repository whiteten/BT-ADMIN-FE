export type ReportIconType = 'agent' | 'cti' | 'ivr' | 'channel' | 'system';

export const REPORT_ICON_LABELS: Record<ReportIconType, string> = {
  agent: '상담사',
  cti: 'CTI',
  ivr: 'IVR',
  channel: '채널',
  system: '시스템',
};

export const REPORT_ICON_SVG: Record<ReportIconType, React.ReactNode> = {
  agent: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 11.5 V10 C5 6 8 3.5 12 3.5 C16 3.5 19 6 19 10 V11.5" />
      <path d="M5 11 H4 C3 11 3 12 3 13 V14.5 C3 15.5 3 16 4 16 H5" />
      <path d="M19 11 H20 C21 11 21 12 21 13 V14.5 C21 15.5 21 16 20 16 H19" />
      <circle cx="12" cy="14" r="2.5" />
      <path d="M7 21 C7 18 9.5 17 12 17 C14.5 17 17 18 17 21" />
    </svg>
  ),
  cti: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="11" rx="1.5" />
      <line x1="9" y1="20" x2="15" y2="20" />
      <line x1="12" y1="16" x2="12" y2="20" />
      <path d="M9 13 V11 C9 9 10.5 8.5 12 8.5 C13.5 8.5 15 9 15 11 V13" />
      <rect x="8.5" y="13" width="1.5" height="2" rx="0.5" fill="currentColor" stroke="none" />
      <rect x="14" y="13" width="1.5" height="2" rx="0.5" fill="currentColor" stroke="none" />
    </svg>
  ),
  ivr: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 4 H8 V7 L6.5 8.5 C8 12 9.5 13.5 13 15 L14.5 13.5 H17.5 V16.5 C17.5 18.5 16 20 14 20 C9 20 4 15 4 10 V6 C4 5 4 4 5 4 Z" />
      <circle cx="17" cy="5" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="20" cy="5" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="17" cy="8" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="20" cy="8" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  ),
  channel: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="13" r="1.7" fill="currentColor" stroke="none" />
      <path d="M8.5 9.5 Q12 6 15.5 9.5" />
      <path d="M5.5 6.5 Q12 1 18.5 6.5" />
      <line x1="12" y1="14.5" x2="12" y2="20" />
      <line x1="9.5" y1="20" x2="14.5" y2="20" />
    </svg>
  ),
  system: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="4" width="17" height="6" rx="1" />
      <rect x="3.5" y="14" width="17" height="6" rx="1" />
      <circle cx="7" cy="7" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="7" cy="17" r="0.7" fill="currentColor" stroke="none" />
      <line x1="10" y1="7" x2="17" y2="7" />
      <line x1="10" y1="17" x2="17" y2="17" />
    </svg>
  ),
};

export const DOMAIN_LABELS: Record<string, string> = {
  IE: 'PBX',
  IC: 'CTI',
  IR: 'IVR',
};

export const DOMAIN_TAG_COLOR: Record<string, string> = {
  IE: 'blue',
  IC: 'green',
  IR: 'orange',
};

export const DOMAIN_DESCRIPTIONS: Record<string, string> = {
  IE: '내선·트렁크·호 라우팅',
  IC: '상담사·큐·통화 품질',
  IR: '시나리오·노드·자동응답',
};
