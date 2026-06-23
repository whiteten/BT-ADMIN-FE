import { useState } from 'react';
import { FloatButton } from 'antd';
import { MessageSquareText, X } from 'lucide-react';
import AgentChatPanel from './AgentChatPanel';

/**
 * host 메인 홈 우측 하단 floating 위젯.
 * 버튼 → 카드 패널, 패널 안 셀렉트박스로 에이전트 선택 시점부터 대화 시작.
 * 패널(AgentChatPanel)은 open 일 때만 마운트 → X·toggle 닫힘 시 통째로 unmount 되어 대화 상태가 정리된다.
 */
export default function AgentChatFab() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && <AgentChatPanel onClose={() => setOpen(false)} />}

      {/* floating 버튼 — fca 모델 상세(ModelInferenceModal)와 동일 규격: type primary, size-12, 인셋 30px, 아이콘 size-6 */}
      <FloatButton
        type="primary"
        className="!size-12"
        style={{ insetInlineEnd: 30, insetBlockEnd: 30, zIndex: 950 }}
        onClick={() => setOpen((prev) => !prev)}
        aria-label={open ? '대화 닫기' : '에이전트 대화 열기'}
        icon={open ? <X className="size-6" /> : <MessageSquareText className="size-6" />}
      />
    </>
  );
}
