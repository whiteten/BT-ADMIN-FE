/**
 * 정적 자산 모듈 타입 선언 (원본의 @nx/react/typings/{cssmodule,image}.d.ts 대체).
 *
 * svg는 @rsbuild/plugin-svgr mixedImport 규약: default = URL 문자열,
 * named `ReactComponent` = React 컴포넌트 (Icons.tsx의 export 패턴 유지).
 */
declare module '*.svg' {
  import type * as React from 'react';
  export const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement> & { title?: string }>;
  const src: string;
  export default src;
}

declare module '*.png' {
  const src: string;
  export default src;
}
declare module '*.jpg' {
  const src: string;
  export default src;
}
declare module '*.jpeg' {
  const src: string;
  export default src;
}
declare module '*.gif' {
  const src: string;
  export default src;
}
declare module '*.webp' {
  const src: string;
  export default src;
}
declare module '*.ico' {
  const src: string;
  export default src;
}

declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
declare module '*.module.scss' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
declare module '*.css' {
  const content: string;
  export default content;
}
declare module '*.scss' {
  const content: string;
  export default content;
}
