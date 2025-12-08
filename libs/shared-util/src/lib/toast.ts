import { createElement } from 'react';
import { type Id, type ToastContent, type ToastOptions, type ToastPromiseParams, type UpdateOptions, toast as _toast } from 'react-toastify';

/**
 * content wrapper
 * 일반 텍스트를 받을 경우 span으로 감싸줍니다.
 */
const cw = <T = unknown>(content: ToastContent<T>): ToastContent<T> => {
  if (typeof content === 'string') {
    return createElement('span', { className: 'bt-toast-content' }, content);
  }
  return content;
};

/**
 * react-toastify toast wrapper
 */
function tw<T = unknown>(content: ToastContent<T>, options?: ToastOptions<T>): Id {
  return _toast(cw(content), options);
}

tw.success = <T = unknown>(content: ToastContent<T>, options?: ToastOptions<T>): Id => {
  return _toast.success(cw(content), options);
};

tw.error = <T = unknown>(content: ToastContent<T>, options?: ToastOptions<T>): Id => {
  return _toast.error(cw(content), options);
};

tw.info = <T = unknown>(content: ToastContent<T>, options?: ToastOptions<T>): Id => {
  return _toast.info(cw(content), options);
};

tw.warning = <T = unknown>(content: ToastContent<T>, options?: ToastOptions<T>): Id => {
  return _toast.warning(cw(content), options);
};

tw.warn = <T = unknown>(content: ToastContent<T>, options?: ToastOptions<T>): Id => {
  return _toast.warn(cw(content), options);
};

tw.loading = <T = unknown>(content: ToastContent<T>, options?: ToastOptions<T>): Id => {
  return _toast.loading(cw(content), options);
};

tw.promise = <TData = unknown, TError = unknown, TPending = unknown>(
  promise: Promise<TData> | (() => Promise<TData>),
  options: ToastPromiseParams<TData, TError, TPending>,
  toastOptions?: ToastOptions<TData>,
): Promise<TData> => {
  return _toast.promise(promise, options, toastOptions);
};

tw.update = <T = unknown>(toastId: Id, options?: UpdateOptions<T>): void => {
  _toast.update(toastId, options);
};

tw.dismiss = (toastId?: Id): void => {
  _toast.dismiss(toastId);
};

tw.clearWaitingQueue = _toast.clearWaitingQueue;
tw.isActive = _toast.isActive;
tw.done = _toast.done;
tw.onChange = _toast.onChange;
tw.play = _toast.play;
tw.pause = _toast.pause;

export { tw as toast };
