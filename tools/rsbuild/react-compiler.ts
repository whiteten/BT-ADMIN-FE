import { pluginBabel } from '@rsbuild/plugin-babel';

/**
 * React Compiler 적용 (Rsbuild 공식 레시피 — babel을 jsx/tsx로만 스코프해 속도 영향 최소화).
 *
 * 이 코드베이스는 AGENTS.md 방침상 useCallback/useMemo를 쓰지 않고 Compiler의 자동
 * 메모이제이션에 의존한다. 따라서 Compiler는 성능 최적화가 아니라 **정합성 필수 요소**다 —
 * 미적용 시 인라인 콜백이 렌더마다 재생성되어 effect deps가 매번 바뀌고,
 * 세션 WebSocket 연결/해제 무한 루프가 실측됨(useSessionSocket ← SharedInfoProvider
 * 인라인 onClose, 2026-07-15 브라우저 검증).
 */
export const pluginReactCompiler = () =>
  pluginBabel({
    // ⚠️ jsx/tsx만 걸면 .ts 커스텀 훅이 비컴파일로 남아 불안정 반환값 → 하위 effect
    // setState 루프("Maximum update depth exceeded", ipron 국선관리 실측 2026-07-15).
    // 원본(.babelrc)은 babel-loader가 앱·libs의 모든 ts/tsx를 컴파일했다 — 동일 범위 유지.
    include: /\.(?:jsx?|tsx?)$/,
    exclude: /[\\/]node_modules[\\/]/,
    babelLoaderOptions(opts) {
      opts.plugins ??= [];
      // target 19: 원본 .babelrc 옵션 이관 (React 19 — 런타임 폴리필 불필요 모드)
      opts.plugins.unshift(['babel-plugin-react-compiler', { target: '19' }]);
    },
  });
