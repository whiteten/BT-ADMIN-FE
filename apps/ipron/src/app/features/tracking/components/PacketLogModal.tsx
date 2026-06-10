/**
 * 패킷 전문 실시간 조회 모달.
 *
 * - 시나리오 트리에서 Packet(typeCode=3) / PacketJson(23) / type33 step 클릭 시 열림
 * - 진입 시 SEND/RECV 두 번 API 호출 (병렬)
 * - dataType 3 → ag-Grid (필드명/값/설명)
 * - dataType 23/33 → JSON pretty viewer
 *
 * AS-IS IPR30S1060.jsp:showMessage 대응.
 */
import { useEffect, useState } from 'react';
import { Alert, Empty, Modal, Spin, Tabs, message } from 'antd';
import { Copy, Download } from 'lucide-react';
import { type PacketLogRequest, type PacketLogResponse, packetLogApi } from '../api/packetLogApi';

interface Props {
  open: boolean;
  onClose: () => void;
  /** step 의 raw 메타 — Packet 인 경우만 표시. */
  context: {
    systemId: number | null;
    serviceId: number | null;
    serviceVer: string | null;
    packetId: string | null;
    trKey: string | null;
    date: string | null; // YYYYMMDD
    dataType: number; // 3 / 23 / 33
    menuName?: string | null;
    typeNm?: string | null;
  } | null;
}

type LoadState = { kind: 'idle' } | { kind: 'loading' } | { kind: 'ready'; send: PacketLogResponse | null; recv: PacketLogResponse | null; sendErr?: string; recvErr?: string };

function fmtJson(jsonStr: string | null): string {
  if (!jsonStr) return '';
  try {
    return JSON.stringify(JSON.parse(jsonStr), null, 2);
  } catch {
    return jsonStr;
  }
}

function PacketBody({ data, error, dataType }: { data: PacketLogResponse | null; error?: string; dataType: number }) {
  if (error) return <Alert type="error" message={error} showIcon className="m-3" />;
  if (!data) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="응답 없음" className="py-8" />;

  // JSON 뷰
  if (dataType === 23 || dataType === 33) {
    const pretty = fmtJson(data.json);
    if (!pretty) return <Empty description="JSON 본문 없음" className="py-8" />;
    return (
      <div className="relative px-3 py-2">
        <button
          className="absolute right-4 top-3 z-10 inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-blue-600 bg-white border border-gray-200 px-2 py-0.5 rounded"
          onClick={() => {
            navigator.clipboard.writeText(pretty);
            message.success('복사됨');
          }}
        >
          <Copy size={12} /> 복사
        </button>
        <pre className="text-[11.5px] bg-gray-50 border border-gray-200 rounded p-3 overflow-auto max-h-[480px] font-mono leading-relaxed">{pretty}</pre>
      </div>
    );
  }

  // 필드 그리드 + raw text (CK=null 행)
  const grid = data.fields.filter((f) => f.ck !== null);
  const raw = data.fields.filter((f) => f.ck === null);

  return (
    <div className="flex flex-col">
      {grid.length > 0 && (
        <div className="overflow-auto max-h-[360px]">
          <table className="w-full text-[12px]">
            <thead className="bg-gray-50 text-gray-600 sticky top-0">
              <tr>
                <th className="text-center w-12 py-1.5 border-b border-gray-200">반복</th>
                <th className="text-left px-2 py-1.5 border-b border-gray-200 w-[140px]">필드명</th>
                <th className="text-left px-2 py-1.5 border-b border-gray-200 w-[280px]">필드값</th>
                <th className="text-left px-2 py-1.5 border-b border-gray-200">필드 설명</th>
              </tr>
            </thead>
            <tbody>
              {grid.map((f, i) => (
                <tr key={i} className="hover:bg-blue-50/40">
                  <td className="text-center text-[10.5px] text-gray-400 border-b border-gray-100 py-1">{f.ck === 'TRUE' ? '✓' : ''}</td>
                  <td className="px-2 py-1 border-b border-gray-100 font-medium text-gray-800">{f.itemName ?? '-'}</td>
                  <td className="px-2 py-1 border-b border-gray-100 font-mono text-blue-700 break-all">{f.itemValue ?? ''}</td>
                  <td className="px-2 py-1 border-b border-gray-100 text-gray-500">{f.itemDesc ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {raw.length > 0 && (
        <details className="px-3 pt-2 pb-3">
          <summary className="text-[11px] text-gray-500 cursor-pointer hover:text-blue-600">raw 원문 보기</summary>
          <pre className="mt-1.5 text-[10.5px] bg-gray-50 border border-gray-200 rounded p-2 overflow-auto max-h-[200px] font-mono whitespace-pre-wrap break-all">
            {raw.map((r) => r.itemValue).join('\n')}
          </pre>
        </details>
      )}
      {grid.length === 0 && raw.length === 0 && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="패킷 본문 없음" className="py-8" />}
      {data.rawText && grid.length === 0 && (
        <details className="px-3 pt-2 pb-3">
          <summary className="text-[11px] text-gray-500 cursor-pointer hover:text-blue-600">복호화 원문 보기</summary>
          <pre className="mt-1.5 text-[10.5px] bg-gray-50 border border-gray-200 rounded p-2 overflow-auto max-h-[200px] font-mono whitespace-pre-wrap break-all">
            {data.rawText}
          </pre>
        </details>
      )}
    </div>
  );
}

export default function PacketLogModal({ open, onClose, context }: Props) {
  const [state, setState] = useState<LoadState>({ kind: 'idle' });

  useEffect(() => {
    if (!open || context?.trKey == null || context.systemId == null || context.serviceId == null) {
      return;
    }
    setState({ kind: 'loading' });
    const baseReq = (sendRecv: 'SEND' | 'RECV'): PacketLogRequest => ({
      systemId: context.systemId!,
      serviceId: context.serviceId!,
      serviceVer: context.serviceVer ?? '',
      packetId: context.packetId ?? '',
      trKey: context.trKey ?? '',
      date: context.date ?? '',
      sendRecv,
      dataType: context.dataType,
    });
    Promise.allSettled([packetLogApi.trace(baseReq('SEND')), packetLogApi.trace(baseReq('RECV'))]).then(([sendR, recvR]) => {
      setState({
        kind: 'ready',
        send: sendR.status === 'fulfilled' ? sendR.value : null,
        recv: recvR.status === 'fulfilled' ? recvR.value : null,
        sendErr: sendR.status === 'rejected' ? String(sendR.reason?.message ?? sendR.reason) : undefined,
        recvErr: recvR.status === 'rejected' ? String(recvR.reason?.message ?? recvR.reason) : undefined,
      });
    });
  }, [open, context]);

  // blocked 사유 분기 — 어느 값이 누락인지 정확히 안내
  // AS-IS 는 빈 trKey 도 호출 → blocked 는 systemId/date 만 체크 (가장 필수)
  const missing: string[] = [];
  if (context) {
    if (!context.systemId) missing.push('systemId');
    if (!context.date) missing.push('date');
  }
  const blocked = context != null && missing.length > 0;

  return (
    <Modal
      open={open}
      onCancel={() => {
        setState({ kind: 'idle' });
        onClose();
      }}
      footer={null}
      width={900}
      title={
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-semibold">패킷 전문</span>
          {context?.packetId && <span className="text-[12px] text-gray-500">/ {context.packetId}</span>}
          {context?.menuName && <span className="text-[12px] text-gray-400">— {context.menuName}</span>}
        </div>
      }
      destroyOnHidden
    >
      {blocked ? (
        <Alert
          type="warning"
          showIcon
          message={missing.length === 1 && missing[0] === 'TRKEY (val8)' ? 'TRKEY가 기록되지 않은 step 입니다' : '패킷 전문 조회에 필요한 정보가 부족합니다'}
          description={
            <div className="text-[12px] space-y-1.5">
              {missing.length === 1 && missing[0] === 'TRKEY (val8)' ? (
                <div>
                  이 step 은 <span className="font-semibold">패킷 전송 결과가 실패(F)</span> 등의 사유로 IVR 장비가 TRKEY(VAL8) 를 기록하지 않았습니다. AS-IS 도 동일하게 조회
                  불가합니다.
                </div>
              ) : (
                <div>
                  다음 값이 없어 IVR 장비에 조회할 수 없습니다: <span className="font-semibold text-red-600">{missing.join(', ')}</span>
                </div>
              )}
              <div className="font-mono text-[11px] text-gray-500">
                systemId={String(context?.systemId ?? 'null')} · serviceId={String(context?.serviceId ?? 'null')} · serviceVer={String(context?.serviceVer ?? 'null')} · packetId=
                {String(context?.packetId ?? 'null')} · trKey={String(context?.trKey ?? 'null')} · date={String(context?.date ?? 'null')} · dataType=
                {String(context?.dataType ?? 'null')}
              </div>
            </div>
          }
        />
      ) : state.kind === 'loading' ? (
        <div className="flex justify-center items-center py-10">
          <Spin tip="IVR 장비 통신 중..." size="large" />
        </div>
      ) : state.kind === 'ready' ? (
        <Tabs
          defaultActiveKey="send"
          size="small"
          items={[
            {
              key: 'send',
              label: '요청 전문',
              children: <PacketBody data={state.send} error={state.sendErr} dataType={context?.dataType ?? 3} />,
            },
            {
              key: 'recv',
              label: '응답 전문',
              children: <PacketBody data={state.recv} error={state.recvErr} dataType={context?.dataType ?? 3} />,
            },
          ]}
        />
      ) : null}
    </Modal>
  );
}
