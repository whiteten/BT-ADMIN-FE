import BookmarkBar from './components/BookmarkBar';
import MenuButton from './components/MenuButton';

export const SUB_HEADER_HEIGHT = 40;

export default function SubHeader() {
  return (
    <div style={{ height: SUB_HEADER_HEIGHT }} className="shrink-0 bg-[color-mix(in_srgb,var(--color-bt-primary),black_20%)] border-b border-white/5">
      <div className="flex items-center gap-3 h-full px-4">
        <MenuButton />
        <div className="h-6 w-px bg-white/10 shrink-0" />
        <div className="flex-1 min-w-0 h-9 flex items-center">
          <BookmarkBar />
        </div>
      </div>
    </div>
  );
}
