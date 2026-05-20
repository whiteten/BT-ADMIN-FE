/**
 * IPRON 메인 페이지 — 모듈 소개 + 핵심 기능 + 작업 안내.
 *
 * 콘텐츠 출처: bridgetec.co.kr (IP컨택센터 IPRON 공식 페이지) — 2026-05 기준.
 */
import { useNavigate } from 'react-router-dom';
import { Headphones, Phone, PhoneForwarded, Radio, Route, Search, Sliders, Users2, Workflow } from 'lucide-react';

interface FeatureCard {
  icon: React.ReactNode;
  title: string;
  desc: string;
}

interface ModuleAction {
  icon: React.ReactNode;
  title: string;
  desc: string;
  menuKey: string;
  path: string;
}

const KEY_FEATURES: FeatureCard[] = [
  {
    icon: <Phone className="size-5" />,
    title: 'PBX 회선 자원 관리',
    desc: '국선(EP) · 내선(DN) · 라우트 · MS 그룹 · 미디어 전달까지 PBX 회선 자원을 일관되게 등록·운영.',
  },
  {
    icon: <PhoneForwarded className="size-5" />,
    title: 'CTI 분배 운영',
    desc: '큐 · 스킬 · 상담사 그룹 정의 및 분배 정책 관리. 통합 콜트래킹으로 분배 결과 추적.',
  },
  {
    icon: <Route className="size-5" />,
    title: '번호 자원 · 라우팅',
    desc: 'DID 번호 변환, 발신 DNIS 사전 변환, DOD, DID 라우트, 발신·수신 번호 차단 정책.',
  },
  {
    icon: <Workflow className="size-5" />,
    title: '프로파일·정책',
    desc: 'SIP · 접근 코드 · 긴급 · 사용자 정의 기능 프로파일 등 운영 정책을 카탈로그화.',
  },
  {
    icon: <Search className="size-5" />,
    title: '통합 콜트래킹',
    desc: '교환기 · IVR · CTI 콜을 단일 화면에서 추적. 시작·종료, 응대/포기, 통화 품질까지.',
  },
  {
    icon: <Sliders className="size-5" />,
    title: '운영 효율 GUI',
    desc: '회선·DN·DNIS·라우팅·정책을 단일 Admin 에서 정의·배포·이력 관리.',
  },
];

const MODULE_ACTIONS: ModuleAction[] = [
  {
    icon: <Phone className="size-4" />,
    title: '회선 관리',
    desc: '국선(EP), 발신 라우트, MS 그룹, 미디어 전달, IP 접근 정책 등 PBX 회선 자원 운영.',
    menuKey: 'ipron-endpoint',
    path: '/ipron/endpoint',
  },
  {
    icon: <Route className="size-4" />,
    title: '번호 변환·차단',
    desc: 'DID 번호 변환, 발신 DNIS 사전 변환, DOD DNIS, 발신·수신 번호 차단 정책.',
    menuKey: 'ipron-did-trans',
    path: '/ipron/did-trans',
  },
  {
    icon: <Users2 className="size-4" />,
    title: 'DN · 프로파일 관리',
    desc: '내선 DN, DN 그룹, COS, SIP/접근/긴급 프로파일 등록 및 일괄 배정.',
    menuKey: 'ipron-dn',
    path: '/ipron/dn',
  },
  {
    icon: <Radio className="size-4" />,
    title: 'DNIS(MCS) 관리',
    desc: 'DNIS 통합 분류(GDN) 및 통계 그룹 정의.',
    menuKey: 'ipron-mcs-dnis',
    path: '/ipron/mcs-dnis',
  },
  {
    icon: <Search className="size-4" />,
    title: '통합 콜 트래킹',
    desc: '교환기·IVR·CTI 콜을 시작·종료·응대·포기·통화 품질까지 한 화면에서 추적.',
    menuKey: 'ipron-tracking-call',
    path: '/ipron/tracking',
  },
];

export default function Main() {
  const navigate = useNavigate();

  return (
    <div className="flex-1 min-h-0 overflow-auto bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-[1200px] mx-auto px-8 py-10 space-y-10">
        {/* Hero */}
        <section className="rounded-xl border border-gray-200 bg-white px-8 py-9 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-start gap-6">
            <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-blue-600 text-white">
              <Headphones className="size-7" />
            </div>
            <div className="flex-1">
              <div className="text-[11px] uppercase tracking-wider text-blue-600 font-semibold mb-1">IPRON · PBX & CTI</div>
              <h1 className="text-[24px] font-semibold text-gray-900 mb-2">교환기 · CTI 통합 운영</h1>
              <p className="text-[13px] text-gray-600 leading-relaxed">
                IPRON 모듈은 콜센터의 <strong className="text-gray-800">교환기(PBX)</strong> 와 <strong className="text-gray-800">CTI 분배</strong> 자원을 한 곳에서 운영합니다.
                국선·내선·라우팅·DNIS 변환 같은 회선 자원과 큐·스킬·상담사 같은 분배 자원을 정의하고, 통합 콜트래킹으로 실제 호의 흐름과 통화 품질까지 한 화면에서 추적할 수
                있습니다.
              </p>
            </div>
          </div>
        </section>

        {/* 핵심 기능 */}
        <section>
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-[15px] font-semibold text-gray-800">핵심 기능</h2>
            <span className="text-[11px] text-gray-400">차세대 컨택센터를 위한 6가지 강점</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {KEY_FEATURES.map((f) => (
              <div key={f.title} className="rounded-lg border border-gray-200 bg-white p-4 hover:border-blue-300 hover:shadow-[0_2px_8px_rgba(59,130,246,0.08)] transition-all">
                <div className="flex items-center gap-2 mb-2 text-blue-600">
                  {f.icon}
                  <span className="text-[13px] font-medium text-gray-900">{f.title}</span>
                </div>
                <p className="text-[12px] text-gray-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 모듈 작업 */}
        <section>
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-[15px] font-semibold text-gray-800">이 모듈에서 할 수 있는 작업</h2>
            <span className="text-[11px] text-gray-400">교환기(PBX) · CTI 통합 운영</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {MODULE_ACTIONS.map((a) => (
              <button
                key={a.menuKey}
                onClick={() => navigate(a.path)}
                className="text-left rounded-lg border border-gray-200 bg-white p-4 hover:border-blue-400 hover:shadow-[0_2px_10px_rgba(59,130,246,0.1)] transition-all group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 text-gray-500 group-hover:text-blue-600 transition-colors">
                    {a.icon}
                    <span className="text-[13px] font-medium text-gray-900">{a.title}</span>
                  </div>
                  <span className="text-[11px] text-gray-300 group-hover:text-blue-500 transition-colors">바로가기 →</span>
                </div>
                <p className="text-[12px] text-gray-600 leading-relaxed">{a.desc}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Footer note */}
        <div className="text-[10px] text-gray-400 text-center pb-4">※ 본 화면 정보는 bridgetec.co.kr 공식 IPRON 소개를 기반으로 작성되었습니다.</div>
      </div>
    </div>
  );
}
