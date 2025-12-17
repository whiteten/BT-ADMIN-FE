import { useEffect, useRef, useState } from 'react';
import JsonView from '@uiw/react-json-view';
import { vscodeTheme } from '@uiw/react-json-view/vscode';
import { Button, FloatButton, Input, type InputRef, Space } from 'antd';
import dayjs from 'dayjs';
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

interface ChatMessage {
  id: number;
  type: 'request' | 'response';
  content: string | object;
  timestamp: string;
}

export default function ModelTestModal() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('tab1');
  const [inputValue, setInputValue] = useState('');
  const [tab1Messages, setTab1Messages] = useState<ChatMessage[]>([]);
  const [tab2Messages, setTab2Messages] = useState<ChatMessage[]>([]);
  const inputRef = useRef<InputRef>(null);
  const tab1ScrollRef = useRef<HTMLDivElement>(null);
  const tab2ScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tab1ScrollRef.current) {
      tab1ScrollRef.current.scrollTop = tab1ScrollRef.current.scrollHeight;
    }
  }, [tab1Messages]);

  useEffect(() => {
    if (tab2ScrollRef.current) {
      tab2ScrollRef.current.scrollTop = tab2ScrollRef.current.scrollHeight;
    }
  }, [tab2Messages]);

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const timestamp = dayjs().format('HH:mm');
    const requestMessage: ChatMessage = {
      id: Date.now(),
      type: 'request',
      content: inputValue.trim(),
      timestamp,
    };

    // TODO: API 연동 후, 응답 메시지 별도 추가 구현
    const responseMessage: ChatMessage = {
      id: Date.now() + 1,
      type: 'response',
      content: jsonValueSample,
      timestamp,
    };

    if (activeTab === 'tab1') {
      setTab1Messages((prev) => [...prev, requestMessage, responseMessage]);
    } else {
      setTab2Messages((prev) => [...prev, requestMessage, responseMessage]);
    }

    setInputValue('');
    inputRef.current?.focus();
  };

  const handlePressEnter = () => {
    handleSendMessage();
  };

  const handleClickSendBtn = () => {
    handleSendMessage();
  };

  const renderMessages = (messages: ChatMessage[]) => {
    return messages.map((msg) =>
      msg.type === 'request' ? (
        <div key={msg.id} className="flex gap-2 items-end mb-3 flex-row-reverse">
          <div className="bg-[#405189] max-w-[80%] px-3 py-2 rounded-[12px] rounded-br-[2px]">
            <p className="text-sm text-white">{msg.content as string}</p>
          </div>
          <span className="text-sm text-[#888B9A]">{msg.timestamp}</span>
        </div>
      ) : (
        <div key={msg.id} className="flex gap-2 mb-3 items-end">
          <JsonView value={msg.content as object} {...jsonViewOptions} className="p-3 rounded-[12px] rounded-bl-[2px]" />
          <span className="text-sm text-[#888B9A]">{msg.timestamp}</span>
        </div>
      ),
    );
  };

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
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full gap-0 overflow-hidden">
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
                <div ref={tab1ScrollRef} className="w-full h-full overflow-y-auto p-5">
                  {renderMessages(tab1Messages)}
                </div>
              </TabsContent>
              <TabsContent value="tab2" className="flex-1 min-h-0">
                <div ref={tab2ScrollRef} className="w-full h-full overflow-y-auto p-5">
                  {renderMessages(tab2Messages)}
                </div>
              </TabsContent>
            </Tabs>
          </div>
          <div className="shrink-0 h-[72px] border-t rounded-b-lg px-5 py-4">
            <Space.Compact block>
              <Input ref={inputRef} placeholder="내용을 입력하세요." value={inputValue} onChange={(e) => setInputValue(e.target.value)} onPressEnter={handlePressEnter} />
              <Button
                icon={<IconSend className="size-6" />}
                classNames={{
                  icon: 'flex items-center justify-center text-[#5D5D5D]',
                }}
                onClick={handleClickSendBtn}
              />
            </Space.Compact>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
