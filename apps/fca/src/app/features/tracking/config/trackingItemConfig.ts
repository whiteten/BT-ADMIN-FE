import {
  type LucideIcon,
  ArrowLeftRight, // TYPE 8 (절체)
  ArrowRightLeft, // TYPE 13 (스위치)
  Bot, // TYPE 50, 51 (봇응답)
  Clock, // TYPE 81 (이벤트대기)
  Database, // TYPE 5 (DB쿼리)
  FolderClosed, // TYPE 20 (VR닫기)
  FolderOpen, // TYPE 19 (VR열기)
  Forward, // TYPE 14 (전환)
  Headphones, // TYPE 4 (CTI/쿼리응답)
  HelpCircle, // 미정의 타입 기본값
  Info, // TYPE 6, 27, 28, 29 (정보/사용자정의)
  Keyboard, // TYPE 1, 41 (GETDIGIT)
  LayoutGrid, // TYPE 62 (메뉴변경)
  MessageSquare, // TYPE 22 (VR응답)
  Mic, // TYPE 11 (녹음)
  Mic2, // TYPE 18 (음성인식)
  Navigation, // TYPE 60 (메뉴호출)
  Package, // TYPE 3, 23 (패킷)
  PhoneOff, // TYPE 10 (연결해제)
  PhoneOutgoing, // TYPE 15 (외부발신)
  Radio, // TYPE 17 (채널할당)
  Repeat, // TYPE 61 (서비스변경)
  Send, // TYPE 21 (VR요청)
  Server, // TYPE 53 (서버등록)
  ServerOff, // TYPE 54 (서버해제)
  SquareArrowRight, // TYPE 0 (일반 메뉴진입)
  StopCircle, // TYPE 12 (중단)
  Tags, // TYPE 52 (봇슬롯)
  Unplug, // TYPE 16 (스위치해제)
  UserCog, // TYPE 63 (사용자환경)
  Volume2, // TYPE 2, 26, 40 (멘트재생)
  Zap, // TYPE 80 (이벤트설정)
} from 'lucide-react';

export interface TrackingItemConfig {
  icon: LucideIcon;
  color: string;
}

/**
 * TYPE 코드 → 아이콘/색상 설정.
 * AS-IS 레거시 icon-* 매핑 기준으로 lucide-react 아이콘으로 전환.
 */
const TRACKING_ITEM_CONFIG: Record<number, TrackingItemConfig> = {
  // 기본 타입
  0: { icon: SquareArrowRight, color: 'text-blue-600' }, // 메뉴진입
  1: { icon: Keyboard, color: 'text-indigo-500' }, // GETDIGIT
  2: { icon: Volume2, color: 'text-purple-500' }, // PLAY/멘트재생
  3: { icon: Package, color: 'text-cyan-600' }, // 패킷
  4: { icon: Headphones, color: 'text-teal-600' }, // CTI/쿼리응답
  5: { icon: Database, color: 'text-blue-500' }, // DB쿼리
  6: { icon: Info, color: 'text-slate-500' }, // 정보
  8: { icon: ArrowLeftRight, color: 'text-orange-500' }, // 절체(HA)

  // 확장 타입 (10~22)
  10: { icon: PhoneOff, color: 'text-red-500' }, // 연결해제
  11: { icon: Mic, color: 'text-red-400' }, // 녹음
  12: { icon: StopCircle, color: 'text-red-600' }, // 중단
  13: { icon: ArrowRightLeft, color: 'text-slate-500' }, // 스위치
  14: { icon: Forward, color: 'text-blue-400' }, // 전환
  15: { icon: PhoneOutgoing, color: 'text-green-500' }, // 외부발신
  16: { icon: Unplug, color: 'text-slate-400' }, // 스위치해제
  17: { icon: Radio, color: 'text-indigo-400' }, // 채널할당
  18: { icon: Mic2, color: 'text-violet-500' }, // 음성인식
  19: { icon: FolderOpen, color: 'text-amber-500' }, // VR열기
  20: { icon: FolderClosed, color: 'text-amber-600' }, // VR닫기
  21: { icon: Send, color: 'text-sky-500' }, // VR요청
  22: { icon: MessageSquare, color: 'text-sky-600' }, // VR응답

  // 특수/사용자정의 타입
  23: { icon: Package, color: 'text-cyan-600' }, // 패킷(2)
  26: { icon: Volume2, color: 'text-purple-500' }, // 멘트재생
  27: { icon: Info, color: 'text-slate-500' }, // 사용자정의1
  28: { icon: Info, color: 'text-slate-500' }, // 사용자정의2
  29: { icon: Info, color: 'text-slate-500' }, // 사용자정의3

  // Bot 연동 타입
  40: { icon: Volume2, color: 'text-purple-500' }, // 멘트재생(Bot)
  41: { icon: Keyboard, color: 'text-indigo-500' }, // GETDIGIT(Bot)

  // Bot 음성/응답 타입
  50: { icon: Mic2, color: 'text-violet-600' }, // 봇음성인식
  51: { icon: Bot, color: 'text-violet-500' }, // 봇응답
  52: { icon: Tags, color: 'text-violet-400' }, // 봇슬롯

  // 서버 등록/해제
  53: { icon: Server, color: 'text-green-600' }, // 서버등록
  54: { icon: ServerOff, color: 'text-red-400' }, // 서버해제

  // 메뉴/서비스 제어
  60: { icon: Navigation, color: 'text-blue-500' }, // 메뉴호출
  61: { icon: Repeat, color: 'text-blue-600' }, // 서비스변경
  62: { icon: LayoutGrid, color: 'text-indigo-500' }, // 메뉴변경
  63: { icon: UserCog, color: 'text-slate-600' }, // 사용자환경

  // Bot 이벤트
  80: { icon: Zap, color: 'text-yellow-500' }, // 이벤트설정
  81: { icon: Clock, color: 'text-yellow-600' }, // 이벤트대기
};

const DEFAULT_CONFIG: TrackingItemConfig = {
  icon: HelpCircle,
  color: 'text-slate-400',
};

export function getTrackingItemConfig(type: number): TrackingItemConfig {
  return TRACKING_ITEM_CONFIG[type] ?? DEFAULT_CONFIG;
}

/** 결과 코드 색상 */
export function getResultColor(result: string | null | undefined): string {
  if (!result) return 'text-slate-400';
  const code = result.charAt(0);
  if (code === 'S') return 'text-green-600';
  if (code === 'F') return 'text-red-500';
  if (code === 'C') return 'text-orange-500';
  if (code === 'A') return 'text-blue-500';
  return 'text-slate-500';
}
