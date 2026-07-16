import { useEffect, useState } from 'react';
import { Button, Input, Select } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';
import { withBasePath } from '@/shared-util';

/**
 * 실시간 감청 테스트 폼 (데모).
 *
 * Veloce가 API로 제공하는 실시간 스트리밍을 SWAT FE가 소비하는 흐름을 보여주기 위한 PoC 페이지.
 * 파라미터를 입력하고 시작하면 별도 팝업([RealtimePlayerPage])이 열려 해당 내선의 통화를
 * 실시간 청취한다. 음원은 입력한 api_base(Veloce API)가 제공. (V5 RealTimeTestForm.tsx 이식)
 *
 * 팝업은 chromeless 라우트 `/vel/monitoring/realtime-player`(Chromeless 래퍼로 Layout chrome 제거)로 띄운다.
 * 끝까지 가져갈 페이지가 아니라 데모용.
 */

const breadcrumb = [{ title: 'VEL' }, { title: '실시간감청 데모', path: '/vel/monitoring/realtime-test' }];

// 녹취/감청 서버 주소 선택지. 2026-06-19 구 100.100.107.101 → VIP .27/.28 로 이전(이중화).
const SERVER_IP_OPTIONS = [
  { value: '100.100.107.27', label: '100.100.107.27 (VIP)' },
  { value: '100.100.107.28', label: '100.100.107.28 (VIP)' },
  { value: '100.100.107.101', label: '100.100.107.101 (구·레거시)' },
];

const FIELDS: { name: keyof FormState; label: string; placeholder?: string; full?: boolean; options?: { value: string; label: string }[] }[] = [
  { name: 'tenant_id', label: '회사 아이디 (Tenant ID)' },
  { name: 'manager_id', label: '청취자 아이디 (Manager ID)' },
  { name: 'agent_dn', label: '내선번호 (Agent DN)', placeholder: '감청할 내선번호' },
  { name: 'agent_id', label: '상담원 사번 (Agent ID)' },
  { name: 'agent_name', label: '상담원 성명 (Agent Name)' },
  { name: 'ip', label: '서버 IP', options: SERVER_IP_OPTIONS },
  { name: 'port', label: '포트' },
  { name: 'media_ip', label: '미디어 IP (Media IP)', options: SERVER_IP_OPTIONS },
  { name: 'media_port', label: '미디어 포트 (Media Port)' },
];

interface FormState {
  tenant_id: string;
  manager_id: string;
  agent_dn: string;
  agent_id: string;
  agent_name: string;
  ip: string;
  port: string;
  media_ip: string;
  media_port: string;
}

const INITIAL: FormState = {
  tenant_id: '2000000001',
  manager_id: 'btadmin',
  agent_dn: '4409',
  agent_id: 'agent01',
  agent_name: '홍길동',
  ip: '100.100.107.27',
  port: '7801',
  media_ip: '100.100.107.27',
  media_port: '7620',
};

export default function RealtimeTestPage() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const [form, setForm] = useState<FormState>(INITIAL);

  const handleChange = (name: keyof FormState, value: string) => setForm((prev) => ({ ...prev, [name]: value }));

  const handleStart = (mode: 'poll' | 'stream' | 'ws') => {
    const qs = new URLSearchParams({ ...form, mode }).toString();
    const w = 560;
    const h = 560;
    const left = Math.max(0, (window.screen.width - w) / 2);
    const top = Math.max(0, (window.screen.height - h) / 2);
    const name = `RealtimePlayer-${mode}-${form.agent_dn}-${Date.now()}`;
    window.open(withBasePath(`/vel/monitoring/realtime-player?${qs}`), name, `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`);
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="w-full h-full bg-white bt-shadow p-7">
        <div className="w-full max-w-3xl mx-auto flex flex-col gap-5">
          <header className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <h2 className="text-base font-semibold">실시간 감청 테스트 설정</h2>
            <span className="text-xs text-gray-400">Veloce API 소비 데모 (PoC)</span>
          </header>

          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            {FIELDS.map((f) => (
              <div key={f.name} className={`flex flex-col gap-1 ${f.full ? 'col-span-2' : ''}`}>
                <label className="text-xs text-gray-500">{f.label}</label>
                {f.options ? (
                  <Select value={form[f.name]} options={f.options} onChange={(value) => handleChange(f.name, value)} />
                ) : (
                  <Input
                    value={form[f.name]}
                    placeholder={f.placeholder}
                    onChange={(e) => handleChange(f.name, e.target.value)}
                    {...(f.name === 'agent_dn' ? { style: { fontWeight: 600, color: '#6366f1' } } : {})}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <Button type="primary" size="large" onClick={() => handleStart('poll')} style={{ background: '#6366f1', borderColor: '#6366f1', flex: 1 }}>
              청취 (폴링·원래)
            </Button>
            <Button size="large" onClick={() => handleStart('stream')} style={{ flex: 1 }}>
              스트림 테스트 (BFF 패스스루)
            </Button>
            <Button size="large" onClick={() => handleStart('ws')} style={{ flex: 1 }}>
              WebSocket (BFF /ws/proxy)
            </Button>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded p-4 text-xs text-gray-500 leading-relaxed">
            <p className="font-medium text-gray-600 mb-1">💡 안내</p>
            <b>청취 (폴링·원래)</b> — <code>/vel-realtime-play</code> 세그먼트 폴링. BFF aggregation을 통과하는 현행 방식(운영 동작).
            <br />
            <b>스트림 테스트 (BFF 패스스루)</b> — <code>/vel-realtime-stream</code> 무한 스트림. BFF가 무한 audio/mpeg를 flush(패스스루)하는지 검증용. 미지원이면 0바이트로 막혀
            플레이어에 실패 표시됩니다.
            <br />
            <b>WebSocket (BFF /ws/proxy)</b> — <code>/ws/proxy/vel/realtime</code> 로 BFF 범용 WS 프록시 경유. VEL이 Core 오디오를 BINARY 프레임으로 push. BFF aggregation 우회(무한
            스트림 정식 해법 후보).
            <br />
            내선번호 등을 입력하고 버튼을 누르면 별도 감청 플레이어 팝업이 열리고, 해당 내선 통화 발생 시 실시간 음성이 재생됩니다.
          </div>
        </div>
      </div>
    </div>
  );
}
