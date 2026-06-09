/**
 * Highlight — 텍스트에서 검색어와 일치하는 첫 구간을 <mark>로 강조.
 *
 * 메뉴 크게보기(PanelMega) 검색 하이라이트와 동일 스펙(amber). 트리·목록 등에서 공통 재사용.
 * query 가 비었거나 매칭이 없으면 원본 텍스트를 그대로 반환한다(대소문자 무시, 첫 매칭만 강조).
 */
export function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return text;
  const i = text.toLowerCase().indexOf(query.toLowerCase());
  if (i === -1) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-amber-200/70 text-inherit rounded-sm px-px">{text.slice(i, i + query.length)}</mark>
      {text.slice(i + query.length)}
    </>
  );
}

export default Highlight;
