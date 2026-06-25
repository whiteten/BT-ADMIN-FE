import { useState } from 'react';
import { Select, type SelectProps } from 'antd';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  /** 최대 태그 개수 — 초과 입력 차단. 미지정 시 무제한. */
  maxTags?: number;
  placeholder?: string;
  size?: SelectProps['size'];
  disabled?: boolean;
  className?: string;
}

/**
 * 태그 입력 — antd Select(mode="tags") 래퍼.
 * <p>
 * 검색어가 있을 때만 드롭다운을 연다. 태그를 추가한 뒤 빈 입력 상태에서 Enter를 다시 누르면
 * 방금 추가된 값이 활성 옵션으로 남아 토글 해제(삭제)되는 antd 기본 동작을 막기 위함이다.
 */
export default function TagInput({ value, onChange, maxTags, placeholder = '태그 입력 후 Enter 또는 쉼표', size, disabled, className }: TagInputProps) {
  const [open, setOpen] = useState(false);

  return (
    <Select
      mode="tags"
      value={value}
      onChange={(v) => {
        const next = v as string[];
        onChange(maxTags ? next.slice(0, maxTags) : next);
        setOpen(false);
      }}
      onSearch={(text) => setOpen(!!text)}
      onBlur={() => setOpen(false)}
      open={open}
      maxCount={maxTags}
      tokenSeparators={[',']}
      notFoundContent={null}
      suffixIcon={null}
      placeholder={placeholder}
      size={size}
      disabled={disabled}
      style={{ width: '100%' }}
      className={className}
    />
  );
}
