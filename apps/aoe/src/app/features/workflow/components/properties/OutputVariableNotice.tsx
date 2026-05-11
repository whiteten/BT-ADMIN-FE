import { buildOutputVariableId } from '../../utils/variableTokens';

interface OutputVariableNoticeProps {
  nodeId: string;
  /** 현재 노드의 nodeLabel — output_variable 미저장 케이스의 미리보기용 */
  nodeLabel?: string;
  /** 노드 data 에 저장된 output_variable (있으면 우선) */
  outputVariable?: string;
  /** 데이터 타입 라벨 (기본: "string") */
  dataType?: string;
  /** 보조 설명 (기본: "생성된 내용") */
  description?: string;
}

/**
 * 노드의 출력 변수를 readonly 로 안내하는 카드.
 * 사용자가 입력하지 않고 노드 생성 시 자동으로 nodeLabel 기반 변수명이 부여됨을 보여준다.
 */
export default function OutputVariableNotice({ nodeId, nodeLabel, outputVariable, dataType = 'string', description = '생성된 내용' }: OutputVariableNoticeProps) {
  const resolved = outputVariable ?? buildOutputVariableId(nodeLabel, nodeId);
  const token = `{{${resolved}}}`;
  return (
    <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
      <div className="text-xs font-medium text-gray-700">출력 변수</div>
      <div className="mt-1 flex items-center gap-2 flex-wrap">
        <code className="text-[11px] text-blue-700 break-all">{token}</code>
        <span className="text-[10px] text-gray-400">
          {dataType} · {description}
        </span>
      </div>
    </div>
  );
}
