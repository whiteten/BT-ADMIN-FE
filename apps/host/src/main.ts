/**
 * [dev 전용] react-refresh 다중 런타임 브리지 (poc/nx23-rspack2 브랜치 ab313e9a 이월).
 *
 * MF 구조에선 host·remote가 각자 자기 react-refresh 런타임을 번들한다. remote 런타임은
 * host보다 늦게 로드되는데, react-refresh는
 *  ⑴ DevTools 확장이 없을 때 만드는 스텁 훅이 inject된 렌더러(react-dom)를 renderers
 *     맵에 저장하지 않아 늦게 붙는 런타임이 렌더러를 못 잡고,
 *  ⑵ 이미 마운트 완료된 루트는 늦게 붙은 런타임의 mountedRoots에 영원히 추가되지 않아
 *     performReactRefresh가 실행돼도 재렌더할 대상이 없다.
 * → remote 코드 수정 시 hot 모듈 교체는 되는데 화면 재렌더가 안 일어난다.
 *
 * 순정 Rsbuild 2 + @module-federation/rsbuild-plugin 2.7에서도 동일 결함 재현 확인
 * (2026-07-15 브라우저 계측: refresh 플래그 양쪽 주입됨·hook.renderers.size===0).
 * 업스트림 미해결(react-refresh-webpack-plugin#394·#863). Vite 진영은 @vitejs/plugin-react의
 * MF 전용 reactRefreshHost 옵션으로 공식 해결 — 같은 원리의 보정을 이 파일이 담당한다.
 * Rsbuild에 동등 옵션이 생기면 이 브리지는 삭제 가능.
 *
 * 브리지 동작:
 *  1. hook.inject를 감싸 렌더러를 renderers 맵에 저장 — 늦은 런타임이 helpers를 줍게 함
 *  2. hook.onCommitFiberRoot를 감싸 살아 있는 루트를 수집
 *  3. remote refresh 런타임이 주입 완료 표시로 세우는 앱별 플래그
 *     (__reactRefreshInjected_<app> — rsbuild.config.ts output.uniqueName으로 네임스페이스됨)에
 *     setter를 걸어, 주입 직후 수집된 루트를 "최초 마운트 커밋"(alternate=null)으로 위장
 *     재통지 → 그 런타임의 mountedRoots·helpersByRoot에 루트가 등록됨
 *
 * 반드시 react-dom 로드(bootstrap) 전에 실행돼야 한다 — main.ts 최상단 유지.
 */
if (process.env.NODE_ENV !== 'production') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = globalThis as any;
  const hook = g.__REACT_DEVTOOLS_GLOBAL_HOOK__;
  if (hook && hook.renderers instanceof Map && typeof hook.inject === 'function' && !hook.isDisabled) {
    // 1. 렌더러 저장 브리지
    const origInject = hook.inject.bind(hook);
    hook.inject = (injected: unknown) => {
      const id = origInject(injected);
      hook.renderers.set(id, injected);
      return id;
    };

    // 2. 루트 수집
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const liveRoots = new Map<unknown, Set<any>>(); // rendererId → roots
    const origCommit = typeof hook.onCommitFiberRoot === 'function' ? hook.onCommitFiberRoot.bind(hook) : undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    hook.onCommitFiberRoot = function (id: unknown, root: any, ...rest: unknown[]) {
      try {
        if (!liveRoots.has(id)) liveRoots.set(id, new Set());
        liveRoots.get(id)?.add(root);
      } catch {
        /* dev 편의 브리지 — 수집 실패는 무시 */
      }
      return origCommit ? origCommit(id, root, ...rest) : undefined;
    };

    // 3. 위장 재통지 — 수집된 루트를 "최초 마운트 커밋"으로 다시 흘려 모든(신규 포함)
    //    refresh 런타임의 mountedRoots에 등록시킨다. Set 기반이라 중복 등록 무해.
    const rebind = () => {
      for (const [id, roots] of liveRoots) {
        for (const root of roots) {
          const cur = root?.current;
          if (!cur) continue;
          const alt = cur.alternate;
          try {
            cur.alternate = null; // react-refresh가 '새 루트 마운트'로 판정하는 조건
            hook.onCommitFiberRoot(id, root, undefined, false);
          } finally {
            cur.alternate = alt;
          }
        }
      }
    };
    g.__BT_REFRESH_REBIND__ = rebind;

    // remote refresh entry가 주입을 마치면 플래그를 세운다 — 그 순간 rebind 예약.
    // 앱 목록은 tools/mf/app-ports.ts(APP_PORTS)와 동일 집합.
    const apps = ['host', 'manager', 'fca', 'ipron', 'aoe', 'stt', 'ivr', 'insight', 'taskboard', 'campaign', 'vel', 'custom'];
    for (const app of apps) {
      const key = `__reactRefreshInjected_${app}`;
      if (g[key] !== undefined) continue; // 이미 주입된 빌드(host 자신 등)는 스킵
      let value: unknown;
      try {
        Object.defineProperty(g, key, {
          configurable: true,
          get: () => value,
          set: (next) => {
            value = next;
            setTimeout(rebind, 0); // 주입 직후(엔트리 실행 중) 밖에서 안전하게 재통지
          },
        });
      } catch {
        /* defineProperty 실패 시 해당 앱만 브리지 미적용 */
      }
    }
  }
}

import('./bootstrap');
