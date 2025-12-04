import type { CustomNoRowsOverlayProps } from 'ag-grid-react';
import { IconDataEmpty } from './Icons';

interface AggridNoRowsOverlayProps extends CustomNoRowsOverlayProps {
  message?: string;
}

export default function AggridNoRowsOverlay(props: AggridNoRowsOverlayProps) {
  const { message } = props;
  const defaultMessage = '검색된 데이터가 없습니다.';
  return (
    <div className="w-full h-full flex flex-col gap-4 items-center justify-center">
      <IconDataEmpty className="size-15 text-gray-500" />
      <p className="text-base text-gray-500">{message ?? defaultMessage}</p>
    </div>
  );
}
