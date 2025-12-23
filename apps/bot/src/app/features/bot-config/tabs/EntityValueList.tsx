import { useParams } from 'react-router-dom';
import { useGetEntityValues } from '../hooks/useModelQueries';

export default function EntityValueList() {
  const { modelId, entityId } = useParams();
  const { data: entityValueList, isFetching } = useGetEntityValues({ params: { modelId, entityId } });

  return (
    <div>
      <pre>{JSON.stringify(entityValueList, null, 2)} </pre>
    </div>
  );
}
