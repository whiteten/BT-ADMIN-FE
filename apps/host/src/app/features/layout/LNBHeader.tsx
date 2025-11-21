import { useNavigate } from 'react-router-dom';
import { SidebarHeader } from '@/components/ui/sidebar';

export default function LNBHeader() {
  const navigate = useNavigate();

  const handleLogoClick = () => {
    navigate('/');
  };

  return (
    <SidebarHeader className="flex items-center justify-center p-3">
      <img src="/assets/images/ci-white-en.svg" alt="CI" className="h-[35px] w-auto object-contain cursor-pointer" onClick={handleLogoClick} />
    </SidebarHeader>
  );
}
