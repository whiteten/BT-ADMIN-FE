/**
 * 대시보드 - Command Center
 * 좌측 패널 + 우측 작업 영역 스타일
 * B2B 엔터프라이즈 관리자용 - 마케팅 문구 없음
 */

import { BarChart3, Bell, Bot, Brain, ChevronRight, Circle, Folder, MessageSquare, Search, Settings, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const menuItems = [
  { icon: Bot, label: '봇 관리', href: '/fca', active: false },
  { icon: Brain, label: '모델 학습', href: '/model', active: false },
  { icon: MessageSquare, label: '대화 분석', href: '/analysis', active: false },
  { icon: BarChart3, label: '통계', href: '/stats', active: false },
  { icon: Users, label: '사용자', href: '/users', active: false },
  { icon: Settings, label: '설정', href: '/settings', active: false },
];

const recentProjects = [
  { name: '고객센터 봇', type: 'Production', updated: '오늘' },
  { name: 'FAQ 응대 봇', type: 'Staging', updated: '어제' },
  { name: '주문조회 봇', type: 'Development', updated: '3일 전' },
];

const systemStatus = [
  { label: 'NLU 엔진', status: 'online' },
  { label: 'API 서버', status: 'online' },
  { label: '학습 큐', status: 'online' },
];

export default function DashboardHero3() {
  return (
    <div className="min-h-[calc(100vh-4rem)] w-full flex bg-slate-100">
      {/* Left Sidebar Panel */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col">
        {/* Logo Area */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-white text-sm">NLU Bot Admin</h1>
              <p className="text-xs text-slate-500">Enterprise</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <p className="text-xs font-medium text-slate-600 uppercase tracking-wider mb-3 px-3">메뉴</p>
          <div className="space-y-1">
            {menuItems.map((item, idx) => (
              <a
                key={idx}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  item.active ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </a>
            ))}
          </div>
        </nav>

        {/* System Status */}
        <div className="p-4 border-t border-slate-800">
          <p className="text-xs font-medium text-slate-600 uppercase tracking-wider mb-3 px-3">시스템 상태</p>
          <div className="space-y-2">
            {systemStatus.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between px-3 py-1.5">
                <span className="text-xs text-slate-500">{item.label}</span>
                <div className="flex items-center gap-1.5">
                  <Circle className={`w-2 h-2 fill-current ${item.status === 'online' ? 'text-emerald-500' : 'text-red-500'}`} />
                  <span className="text-xs text-slate-600">{item.status === 'online' ? '정상' : '오류'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="검색..."
                className="w-64 h-9 pl-9 pr-4 text-sm bg-slate-100 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5 text-slate-500" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </Button>
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-sm font-medium text-slate-600">A</div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-6 overflow-auto">
          {/* Welcome */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-1">대시보드</h2>
            <p className="text-slate-500 text-sm">프로젝트를 선택하거나 새로 생성하세요</p>
          </div>

          {/* Projects Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {/* New Project Card */}
            <Card className="border-dashed border-2 border-slate-300 bg-transparent hover:border-blue-400 hover:bg-blue-50/50 transition-colors cursor-pointer">
              <CardContent className="flex flex-col items-center justify-center h-40 text-slate-500 hover:text-blue-600">
                <div className="w-12 h-12 rounded-xl border-2 border-current border-dashed flex items-center justify-center mb-3">
                  <span className="text-2xl font-light">+</span>
                </div>
                <span className="text-sm font-medium">새 프로젝트</span>
              </CardContent>
            </Card>

            {/* Existing Projects */}
            {recentProjects.map((project, idx) => (
              <Card key={idx} className="bg-white hover:shadow-md transition-shadow cursor-pointer group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                      <Folder className="w-5 h-5 text-slate-600" />
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        project.type === 'Production'
                          ? 'bg-emerald-100 text-emerald-700'
                          : project.type === 'Staging'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {project.type}
                    </span>
                  </div>
                  <h3 className="font-medium text-slate-800 mb-1 group-hover:text-blue-600 transition-colors">{project.name}</h3>
                  <p className="text-xs text-slate-500">업데이트: {project.updated}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quick Actions */}
          <Card className="bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">빠른 실행</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-2">
                {['모델 학습', '인텐트 추가', '테스트 대화', '로그 확인'].map((action, idx) => (
                  <Button key={idx} variant="outline" size="sm" className="text-slate-600 hover:text-slate-800 hover:bg-slate-50">
                    {action}
                    <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
