import { useEffect, useRef } from 'react';
import JsonView from '@uiw/react-json-view';
import { vscodeTheme } from '@uiw/react-json-view/vscode';
import { Button, FloatButton, Input, type InputRef, Space } from 'antd';
import type { AxiosError } from 'axios';
import dayjs from 'dayjs';
import { X } from 'lucide-react';
import { toast } from '@/shared-util';
import { type ChatMessage, useModelInferenceStore } from '../hooks/useModelInferenceStore';
import { useExecuteInference, useGetModel } from '../hooks/useModelQueries';
import { TargetServer } from '../types/inference';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
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

interface ModelInferenceModalProps {
  modelId: string;
}

export default function ModelInferenceModal({ modelId }: ModelInferenceModalProps) {
  const { isOpen, setIsOpen, activeTab, setActiveTab, inputValue, setInputValue, testMessages, prodMessages, addMessage, clearMessages } = useModelInferenceStore();

  const { data: modelData, isLoading: isLoadingModel } = useGetModel({
    params: { modelId },
    queryOptions: { enabled: !!modelId },
  });

  const { mutate: executeInference, isPending: isInferencing } = useExecuteInference({
    mutationOptions: {
      onSuccess: (data) => {
        const timestamp = dayjs().format('HH:mm');
        const responseMessage: ChatMessage = {
          id: Date.now(),
          type: 'response',
          content: data as object,
          timestamp,
        };
        addMessage(activeTab, responseMessage);
      },
      onError: (error) => {
        const timestamp = dayjs().format('HH:mm');
        const responseMessage: ChatMessage = {
          id: Date.now(),
          type: 'response',
          content: (error as AxiosError)?.response?.data ?? (error as AxiosError)?.response ?? error,
          timestamp,
        };
        addMessage(activeTab, responseMessage);
      },
    },
  });

  // modelId 변경 시 대화내역 초기화
  useEffect(() => {
    clearMessages();
  }, [modelId, clearMessages]);

  const inputRef = useRef<InputRef>(null);
  const testScrollRef = useRef<HTMLDivElement>(null);
  const prodScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (testScrollRef.current) {
      testScrollRef.current.scrollTop = testScrollRef.current.scrollHeight;
    }
  }, [testMessages]);

  useEffect(() => {
    if (prodScrollRef.current) {
      prodScrollRef.current.scrollTop = prodScrollRef.current.scrollHeight;
    }
  }, [prodMessages]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setInputValue('');
    }
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;
    if (activeTab === TargetServer.TEST && modelData?.trainStatus !== 2) {
      toast.warning('학습이 완료된 모델만 시험할 수 있습니다.\n모델 학습을 먼저 진행해주세요.');
      return;
    }
    if (activeTab === TargetServer.PROD && modelData?.deployStatus !== 2) {
      toast.warning('배포가 완료된 모델만 시험할 수 있습니다.\n모델 배포를 먼저 진행해주세요.');
      return;
    }

    const timestamp = dayjs().format('HH:mm');
    const text = inputValue.trim();

    const requestMessage: ChatMessage = {
      id: Date.now(),
      type: 'request',
      content: text,
      timestamp,
    };
    addMessage(activeTab, requestMessage);

    // 입력값 초기화
    setInputValue('');

    // API 호출
    const modelType = activeTab;
    executeInference({
      params: { modelId, tenantId: modelData?.tenantId },
      data: { text, modelType },
    });

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
          <JsonView value={msg.content as object} {...jsonViewOptions} className="p-3 rounded-[12px] rounded-bl-[2px]">
            <JsonView.Null render={() => <span style={{ color: '#569cd6' }}>null</span>} />
            <JsonView.Undefined render={() => <span style={{ color: '#569cd6' }}>undefined</span>} />
          </JsonView>
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
        {isLoadingModel ? (
          <div className="flex w-full h-full">
            <FallbackSpinner />
          </div>
        ) : (
          <div className="flex flex-col w-full h-full overflow-hidden">
            <div className="flex items-center justify-between shrink-0 bg-[var(--color-bt-primary)] w-full h-[58px] rounded-t-lg px-6 py-4">
              <span className="text-base text-white">모델 시험</span>
              <X className="size-6 text-white hover:cursor-pointer" onClick={() => setIsOpen(false)} />
            </div>
            <div className="flex-1 min-h-0">
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TargetServer)} className="w-full h-full gap-0 overflow-hidden">
                <TabsList className="w-full p-0 bg-white rounded-none h-[48px] min-h-[48px]">
                  <TabsTrigger
                    value={TargetServer.TEST}
                    className="!shadow-none border-1 border-b-[#E9EBEC] text-[#495057] !rounded-none data-[state=active]:border-b-2 data-[state=active]:border-b-[var(--color-bt-primary)] data-[state=active]:text-[var(--color-bt-primary)]"
                  >
                    학습모델
                  </TabsTrigger>
                  <TabsTrigger
                    value={TargetServer.PROD}
                    className="!shadow-none border-1 border-b-[#E9EBEC] text-[#495057] !rounded-none data-[state=active]:border-b-2 data-[state=active]:border-b-[var(--color-bt-primary)] data-[state=active]:text-[var(--color-bt-primary)]"
                  >
                    배포모델
                  </TabsTrigger>
                </TabsList>
                <TabsContent value={TargetServer.TEST} className="flex-1 min-h-0">
                  <div ref={testScrollRef} className="w-full h-full overflow-y-auto p-5">
                    {renderMessages(testMessages)}
                  </div>
                </TabsContent>
                <TabsContent value={TargetServer.PROD} className="flex-1 min-h-0">
                  <div ref={prodScrollRef} className="w-full h-full overflow-y-auto p-5">
                    {renderMessages(prodMessages)}
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
                  loading={isInferencing}
                />
              </Space.Compact>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// 외부에서 모달을 제어하기 위한 함수
export const modelInferenceModal = {
  open: (message?: string) => {
    const state = useModelInferenceStore.getState();
    if (message) {
      state.setInputValue(message);
    }
    state.setIsOpen(true);
  },
  close: () => {
    useModelInferenceStore.getState().setIsOpen(false);
  },
};
