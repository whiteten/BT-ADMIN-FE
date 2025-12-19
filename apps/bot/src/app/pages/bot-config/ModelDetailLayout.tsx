import { Outlet, useParams } from 'react-router-dom';
import ModelTestModal from '../../features/bot-config/components/ModelTestModal';

export default function ModelDetailLayout() {
  const { modelId } = useParams();

  return (
    <>
      <Outlet />
      <ModelTestModal modelId={modelId ?? ''} />
    </>
  );
}
