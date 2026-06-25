import { useNavigate } from 'react-router-dom';
import { Activity, Bell, Bot, ChevronRight, PhoneCall, Radio, ShieldAlert, Users } from 'lucide-react';
import { useAuthStore } from '@/shared-store';

export default function Main() {
  const { userInfo, getCurrentRoleName } = useAuthStore();
  const navigate = useNavigate();

  const displayName = userInfo?.username ?? userInfo?.userAccount ?? '운영팀장';
  const roleName = getCurrentRoleName() ?? '센터 관리자';

  // 상담 팀장용 실시간 핵심 운영 지표 (현실적이고 시뮬레이션된 데이터)
  const monitorStats = [
    {
      title: '실시간 통화 대기 (큐)',
      value: '2건',
      desc: '현재 통화 연결을 대기 중인 고객 수입니다.',
      icon: PhoneCall,
      color: 'bg-blue-50 text-blue-600 border-blue-100',
      actionText: '콜 추적 및 추이 보기',
      path: '/ipron/tracking',
    },
    {
      title: '통화 연결 및 회선 상태',
      value: '정상 (7개 노드)',
      desc: '교환기 국선 장비들이 모두 장애 없이 정상 작동 중입니다.',
      icon: Radio,
      color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      actionText: '회선 상태 제어하기',
      path: '/ipron/line/endpoint',
    },
    {
      title: '상담직원 및 로그인 현황',
      value: '18명 활성',
      desc: '현재 시스템에 접속 중인 상담사 및 관리자 수입니다.',
      icon: Users,
      color: 'bg-purple-50 text-purple-600 border-purple-100',
      actionText: '계정 및 권한 관리',
      path: '/manager',
    },
  ];

  // 자주 찾는 핵심 업무 바로가기
  const operationalMenus = [
    {
      title: '통합 콜 검색',
      desc: '고객 전화번호, 점유시간 등을 입력해 특정 상담 이력을 빠르게 검색합니다.',
      icon: Bot,
      path: '/ipron/tracking',
      btnText: '콜 검색 이동',
    },
    {
      title: '국선/회선 관리',
      desc: '교환기 통화 채널을 차단하거나 복구하여 통화 회선을 유연하게 관리합니다.',
      icon: Radio,
      path: '/ipron/line/endpoint',
      btnText: '회선 제어 이동',
    },
    {
      title: '보안 정책 제어',
      desc: '관리자 접속 IP 제한, 비밀번호 만료 기간 등의 보안 설정을 간편하게 조율합니다.',
      icon: ShieldAlert,
      path: '/security',
      btnText: '보안 설정 이동',
    },
  ];

  return (
    <div className="min-h-full w-full flex flex-col justify-start gap-6 p-6 bg-[#f8fafc]">
      {/* 1. 상담 팀장 전용 운영 Greeting Banner */}
      <div className="relative overflow-hidden rounded-xl bg-white border border-slate-200/80 p-6 shadow-sm">
        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-blue-50/50 blur-2xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1.5">
              <Activity className="h-3 w-3 animate-pulse" /> Live Operation Dashboard
            </span>
            <h1 className="text-xl font-bold tracking-tight mt-1 text-slate-800">오늘도 편안한 컨택센터 운영을 지원합니다, {displayName}님!</h1>
            <p className="text-slate-500 text-xs mt-1">상담 팀장과 운영 관리자분들이 복잡한 매뉴얼 없이 직관적으로 콜 인프라 상태를 관제하고 조치할 수 있는 스마트 보드입니다.</p>
          </div>
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg p-2.5 shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-extrabold text-xs">{displayName.slice(0, 1).toUpperCase()}</div>
            <div>
              <p className="text-xs font-semibold text-slate-800">{displayName}</p>
              <span className="inline-flex items-center text-[9px] font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-full mt-0.5">{roleName}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. 핵심 라이브 관제 지표 (팀장님이 출근하자마자 직관적으로 보는 영역) */}
      <div>
        <h2 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-3 px-1 flex items-center gap-1.5">
          <Bell className="h-3 w-3 text-slate-400" /> 실시간 주요 운영 관제판
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {monitorStats.map((stat) => (
            <div
              key={stat.title}
              onClick={() => navigate(stat.path)}
              className="group bg-white border border-slate-200 hover:border-blue-400 hover:shadow-sm transition-all duration-200 rounded-xl cursor-pointer p-5 flex flex-col justify-between"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-slate-500">{stat.title}</span>
                  <span className="text-lg font-bold text-slate-900 mt-1">{stat.value}</span>
                </div>
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg border ${stat.color}`}>
                  <stat.icon className="h-4.5 w-4.5" />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-2.5 leading-relaxed">{stat.desc}</p>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-blue-600 group-hover:text-blue-700">
                <span>{stat.actionText}</span>
                <ChevronRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. 직관적인 원클릭 핵심 업무 메뉴 */}
      <div>
        <h2 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-3 px-1">⚙️ 퀵 운영 도구</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {operationalMenus.map((menu) => (
            <div key={menu.title} className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between hover:border-slate-300 transition-all duration-200">
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded bg-slate-100 text-slate-700">
                    <menu.icon className="h-4 w-4" />
                  </div>
                  <h3 className="text-xs font-bold text-slate-800">{menu.title}</h3>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed min-h-[32px]">{menu.desc}</p>
              </div>
              <button
                type="button"
                onClick={() => navigate(menu.path)}
                className="mt-4 w-full py-1.5 text-center text-[10px] font-bold rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              >
                {menu.btnText}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
