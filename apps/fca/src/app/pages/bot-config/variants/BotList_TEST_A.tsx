/**
 * 봇 목록 화면 변경 테스트용 변형.
 * 실제 운영 로직은 없고, "기본 컴포넌트 대신 이 컴포넌트가 렌더되고 있다"는 사실만
 * 한눈에 확인할 수 있도록 안내 화면만 보여준다.
 *
 * 화면 지정 동작 검증이 끝나면 이 파일과 BotList.variants.ts의 components 항목을
 * 함께 제거한다.
 */

import type { BreadcrumbProps } from 'antd';
import PageHeader from '@/components/custom/PageHeader';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '관리', path: '/fca/bot-config' },
  { title: '봇', path: '/fca/bot-config/bot' },
  { title: '봇 목록', path: '/fca/bot-config/bot/list' },
];

export default function BotList_TEST_A() {
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader breadcrumb={breadcrumb} />
      <div className="flex-1 bg-white bt-shadow flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center px-7 py-10">
          <div className="text-2xl font-bold text-[var(--color-bt-primary)]">화면 변경 테스트용 (BotList_TEST_A)</div>
          <p className="text-base text-gray-600 leading-relaxed max-w-[560px]">
            이 화면은 화면 지정 기능 검증을 위한 임시 변형입니다.
            <br />이 컴포넌트가 보인다면 운영자가 봇 목록 path에 <strong>BotList_TEST_A</strong> 변형을 적용한 상태입니다.
          </p>
          <p className="text-sm text-gray-400">테스트가 완료되면 이 파일은 제거됩니다.</p>
        </div>
      </div>
    </div>
  );
}
