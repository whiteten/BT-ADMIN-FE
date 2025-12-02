export default function PageHeader({ title, breadcrumb }: { title: string; breadcrumb: string }) {
  return (
    <header className="flex items-center justify-between w-full h-[58px] min-h-[58px] bg-white bt-shadow px-7 py-4">
      <div>
        <span className="text-[20px] font-bold text-[#495057]">{title}</span>
      </div>
      <div>
        {/* TODO: Breadcrumb 컴포넌트 구현 필요 */}
        <span className="text-[14px] text-[#495057]">{breadcrumb}</span>
      </div>
    </header>
  );
}
