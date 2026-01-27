import { Outlet, useParams } from 'react-router-dom';
import ModelInferenceModal from '../../features/bot-config/components/ModelInferenceModal';

export default function ModelDetailLayout() {
  const { modelId } = useParams();

  return (
    <>
      <Outlet />
      <ModelInferenceModal modelId={modelId ?? ''} />
    </>
  );
}
