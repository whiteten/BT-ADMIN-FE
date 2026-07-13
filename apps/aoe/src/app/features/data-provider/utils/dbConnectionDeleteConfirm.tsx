import type { ModalFuncProps } from 'antd';

/**
 * DB 접속정보 삭제 confirm 옵션.
 * 이 접속정보를 참조 중인 DB 질의도구가 있으면 경고 문구를 담은 옵션을 반환하고,
 * 없으면 undefined 를 반환해 useModal 의 기본 삭제 문구를 그대로 쓴다.
 */
export function getDbConnectionDeleteConfirmOptions(usedCount: number): Partial<ModalFuncProps> | undefined {
  if (usedCount <= 0) return undefined;
  return {
    content: (
      <>
        이 접속정보를 사용하는 DB 질의도구가 <b className="text-red-500">{usedCount}건</b> 있습니다.
        <br />
        삭제하면 해당 질의도구도 함께 삭제됩니다. 정말 삭제하시겠습니까?
      </>
    ),
  };
}
