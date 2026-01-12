import { useLocation } from 'react-router-dom';

export function useModelRoute() {
  const { pathname } = useLocation();

  return {
    isPublic: pathname.includes('/common/'),
  };
}
