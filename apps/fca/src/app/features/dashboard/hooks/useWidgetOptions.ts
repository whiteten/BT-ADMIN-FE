import { useState } from 'react';

const useWidgetOptions = (defaultOptions?: Record<string, unknown>) => {
  const [widgetOptions, setWidgetOptions] = useState<Record<string, unknown>>(() => ({ ...defaultOptions }));

  const setOption = (key: string, value: unknown) => {
    setWidgetOptions((prev) => ({ ...prev, [key]: value }));
  };

  const resetOptions = () => {
    setWidgetOptions({ ...defaultOptions });
  };

  return { widgetOptions, setOption, resetOptions };
};

export default useWidgetOptions;
