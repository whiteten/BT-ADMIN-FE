// wavesurfer.js 플러그인 타입 shim.
//
// 런타임 import 경로는 `.esm.js`(webpack은 package.json exports map으로 정상 해석)이지만,
// 이 워크스페이스 tsconfig는 moduleResolution="node"라 exports map을 따르지 않아 `.esm.js`
// 경로의 선언 파일(regions.d.ts)을 찾지 못한다(TS7016). 확장자 없는 경로는 node 해석으로
// regions.d.ts에 도달하므로, 그 타입을 `.esm.js` 경로로 재노출해 양쪽을 모두 만족시킨다.
declare module 'wavesurfer.js/dist/plugins/regions.esm.js' {
  export * from 'wavesurfer.js/dist/plugins/regions';
  export { default } from 'wavesurfer.js/dist/plugins/regions';
}
