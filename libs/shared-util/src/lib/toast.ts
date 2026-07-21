import type { ReactNode } from 'react';
import { LOG } from './log';
import { type ToastOptions, type ToastType, useToastStore } from './toastStore';

const Log = new LOG('Toast');

/**
 * 자체 토스트(useToastStore + ToastProvider) imperative API.
 * react-toastify 래퍼를 대체하며 기존 호출부 시그니처(success/error/... + autoClose/toastId)를 유지한다.
 * 렌더는 각 앱 루트의 ToastProvider(@/components/custom/ToastProvider)가 담당.
 */
const push = (type: ToastType, content: ReactNode, options?: ToastOptions): string => {
  if (typeof content === 'string') Log.debug(`[${type.toUpperCase()}] ${content}`);
  return useToastStore.getState().push(type, content, options);
};

function tw(content: ReactNode, options?: ToastOptions): string {
  return push('default', content, options);
}

tw.success = (content: ReactNode, options?: ToastOptions): string => push('success', content, options);
tw.error = (content: ReactNode, options?: ToastOptions): string => push('error', content, options);
tw.info = (content: ReactNode, options?: ToastOptions): string => push('info', content, options);
tw.warning = (content: ReactNode, options?: ToastOptions): string => push('warning', content, options);
tw.warn = (content: ReactNode, options?: ToastOptions): string => push('warning', content, options);

/** id 지정 시 해당 알림만, 생략 시 전체 닫기 (react-toastify dismiss와 동일 규약) */
tw.dismiss = (toastId?: string): void => {
  if (toastId === undefined) useToastStore.getState().clear();
  else useToastStore.getState().dismiss(toastId);
};

tw.isActive = (toastId: string): boolean => useToastStore.getState().items.some((it) => it.id === toastId);

/** 전체 타이머 일시정지/재개 */
tw.pause = (): void => useToastStore.getState().pauseAll();
tw.play = (): void => useToastStore.getState().resumeAll();

export { tw as toast };
