import { useParams } from 'react-router-dom';

export default function BotDetail() {
  const { id } = useParams();
  return (
    <div>
      <h1>BotDetail: {id}</h1>
    </div>
  );
}
