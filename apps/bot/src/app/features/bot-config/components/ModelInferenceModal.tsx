import { useEffect, useRef } from 'react';
import JsonView from '@uiw/react-json-view';
import { vscodeTheme } from '@uiw/react-json-view/vscode';
import { Button, FloatButton, Input, type InputRef, Space } from 'antd';
import dayjs from 'dayjs';
import { X } from 'lucide-react';
import { type ChatMessage, useModelTestStore } from '../hooks/useModelTestStore';
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

interface ModelInferenceModalProps {
  modelId: string;
}

export default function ModelInferenceModal({ modelId }: ModelInferenceModalProps) {
  const { isOpen, setIsOpen, activeTab, setActiveTab, inputValue, setInputValue, trainingMessages, deployedMessages, addMessage, clearMessages } = useModelTestStore();

  // modelId 변경 시 대화내역 초기화
  useEffect(() => {
    clearMessages();
  }, [modelId, clearMessages]);

  const inputRef = useRef<InputRef>(null);
  const trainingScrollRef = useRef<HTMLDivElement>(null);
  const deployedScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (trainingScrollRef.current) {
      trainingScrollRef.current.scrollTop = trainingScrollRef.current.scrollHeight;
    }
  }, [trainingMessages]);

  useEffect(() => {
    if (deployedScrollRef.current) {
      deployedScrollRef.current.scrollTop = deployedScrollRef.current.scrollHeight;
    }
  }, [deployedMessages]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setInputValue('');
    }
  };

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

    addMessage(activeTab, requestMessage);
    addMessage(activeTab, responseMessage);

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
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <FloatButton
          type="primary"
          className="!size-12"
          style={{ insetInlineEnd: 30, insetBlockEnd: 30 }}
          icon={isOpen ? <X className="size-6" /> : <IconEdit className="size-6" fill="#FFFFFF" />}
        />
      </PopoverTrigger>
      <PopoverContent side="top" align="end" sideOffset={10} className="w-[440px] h-[80vh] p-0 !rounded-lg">
        <div className="flex flex-col w-full h-full overflow-hidden">
          <div className="flex items-center justify-between shrink-0 bg-[var(--color-bt-primary)] w-full h-[58px] rounded-t-lg px-6 py-4">
            <span className="text-base text-white">모델 시험</span>
            <X className="size-6 text-white hover:cursor-pointer" onClick={() => setIsOpen(false)} />
          </div>
          <div className="flex-1 min-h-0">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'training' | 'deployed')} className="w-full h-full gap-0 overflow-hidden">
              <TabsList className="w-full p-0 bg-white rounded-none h-[48px] min-h-[48px]">
                <TabsTrigger
                  value="training"
                  className="!shadow-none border-1 border-b-[#E9EBEC] text-[#495057] !rounded-none data-[state=active]:border-b-2 data-[state=active]:border-b-[var(--color-bt-primary)] data-[state=active]:text-[var(--color-bt-primary)]"
                >
                  학습모델
                </TabsTrigger>
                <TabsTrigger
                  value="deployed"
                  className="!shadow-none border-1 border-b-[#E9EBEC] text-[#495057] !rounded-none data-[state=active]:border-b-2 data-[state=active]:border-b-[var(--color-bt-primary)] data-[state=active]:text-[var(--color-bt-primary)]"
                >
                  배포모델
                </TabsTrigger>
              </TabsList>
              <TabsContent value="training" className="flex-1 min-h-0">
                <div ref={trainingScrollRef} className="w-full h-full overflow-y-auto p-5">
                  {renderMessages(trainingMessages)}
                </div>
              </TabsContent>
              <TabsContent value="deployed" className="flex-1 min-h-0">
                <div ref={deployedScrollRef} className="w-full h-full overflow-y-auto p-5">
                  {renderMessages(deployedMessages)}
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

// 외부에서 모달을 제어하기 위한 함수
export const modelInferenceModal = {
  open: (message?: string) => {
    const state = useModelTestStore.getState();
    if (message) {
      state.setInputValue(message);
    }
    state.setIsOpen(true);
  },
  close: () => {
    useModelTestStore.getState().setIsOpen(false);
  },
};
