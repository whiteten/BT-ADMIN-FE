import { useState } from 'react';
import JsonView from '@uiw/react-json-view';
import { vscodeTheme } from '@uiw/react-json-view/vscode';
import { Button, FloatButton, Input, Space } from 'antd';
import { X } from 'lucide-react';
import { IconEdit, IconSend } from '@/components/custom/Icons';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const jsonViewOptions = {
  style: vscodeTheme,
  collapsed: false,
  displayObjectSize: false,
  displayDataTypes: false,
  enableClipboard: false,
  highlightUpdates: false,
};

const jsonValueSample = {
  modelName: '긍부정',
  intents: [
    {
      confidence: 48.15974044799805,
      name: '긍정',
    },
    {
      confidence: 43.229610443115234,
      name: '부정',
    },
    {
      confidence: 8.610649108886719,
      name: '기타',
    },
  ],
  entities: [],
};

export default function ModelTestModal() {
  const [open, setOpen] = useState(false);
  // TODO: API 연동 후, 메시지 동적 추가 구현
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <FloatButton
          type="primary"
          className="!size-12"
          style={{ insetInlineEnd: 30, insetBlockEnd: 30 }}
          icon={open ? <X className="size-6" /> : <IconEdit className="size-6" fill="#FFFFFF" />}
        />
      </PopoverTrigger>
      <PopoverContent side="top" align="end" sideOffset={10} className="w-[440px] h-[80vh] p-0 !rounded-lg">
        <div className="flex flex-col w-full h-full overflow-hidden">
          <div className="flex items-center justify-between shrink-0 bg-[var(--color-bt-primary)] w-full h-[58px] rounded-t-lg px-6 py-4">
            <span className="text-base text-white">모델 시험</span>
            <X className="size-6 text-white hover:cursor-pointer" onClick={() => setOpen(false)} />
          </div>
          <div className="flex-1 min-h-0">
            <Tabs defaultValue="tab1" className="w-full h-full gap-0 overflow-hidden">
              <TabsList className="w-full p-0 bg-white rounded-none h-[48px] min-h-[48px]">
                <TabsTrigger
                  value="tab1"
                  className="!shadow-none border-1 border-b-[#E9EBEC] text-[#495057] !rounded-none data-[state=active]:border-b-2 data-[state=active]:border-b-[var(--color-bt-primary)] data-[state=active]:text-[var(--color-bt-primary)]"
                >
                  학습모델
                </TabsTrigger>
                <TabsTrigger
                  value="tab2"
                  className="!shadow-none border-1 border-b-[#E9EBEC] text-[#495057] !rounded-none data-[state=active]:border-b-2 data-[state=active]:border-b-[var(--color-bt-primary)] data-[state=active]:text-[var(--color-bt-primary)]"
                >
                  배포모델
                </TabsTrigger>
              </TabsList>
              <TabsContent value="tab1" className="flex-1 min-h-0">
                <div className="w-full h-full overflow-y-auto p-5">
                  {/* 우측메시지 샘플 */}
                  <div className="flex gap-2 items-end mb-3 flex-row-reverse">
                    <div className="bg-[#405189] max-w-[80%] px-3 py-2 rounded-[12px] rounded-br-[2px]">
                      <p className="text-sm text-white">계좌 비밀번호와 이체 비밀번호를 눌러주십시오.</p>
                    </div>
                    <span className="text-sm text-[#888B9A]">05:51</span>
                  </div>
                  {/* 좌측메시지 샘플 */}
                  <div className="flex gap-2 mb-3 items-end">
                    <JsonView value={jsonValueSample} {...jsonViewOptions} className="p-3 rounded-[12px] rounded-bl-[2px]" />
                    <span className="text-sm text-[#888B9A]">05:51</span>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="tab2">
                <div className="w-full h-full overflow-y-auto p-5"></div>
              </TabsContent>
            </Tabs>
          </div>
          <div className="shrink-0 h-[72px] border-t rounded-b-lg px-5 py-4">
            <Space.Compact block>
              <Input placeholder="내용을 입력하세요." />
              <Button
                icon={<IconSend className="size-6" />}
                classNames={{
                  icon: 'flex items-center justify-center text-[#5D5D5D]',
                }}
              />
            </Space.Compact>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
