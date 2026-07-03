import { Outlet } from 'react-router-dom';
import Chromeless from '@/components/custom/Chromeless';

/**
 * 공개(public) 트리 — RouteShell이 'public' 판정 시 렌더.
 * 세션 체크·개인화 쿼리·WS 세션 이벤트 없이 화면만 그린다.
 * 공개 화면의 데이터 인증은 remote가 스스로 책임진다(taskboard publicAuth 등).
 *
 * Chromeless 강제: chrome(헤더·사이드바·패널)은 SharedInfoProvider(private 트리 전용)가 채우는
 * navigation·userInfo에 의존하므로 public 트리에선 성립 불가 — public ⇒ chromeless 불변식을
 * 게이트가 보장한다(remote leaf가 <Chromeless> 래퍼를 빠뜨려도 깨진 chrome이 노출되지 않음).
 */
export default function PublicRouteGate() {
  return (
    <Chromeless>
      <Outlet />
    </Chromeless>
  );
}
