/**
 * DN 검색 폼 (IPR20S2020)
 * DN 범위(시작~끝) + 상태 + COS + 프로파일 + 검색/초기화
 *
 * 상단 박스와 동일한 흰색 박스로 표시.
 */
import { useEffect, useState } from 'react';
import { Button, Input, Select } from 'antd';
import { RotateCcw, Search } from 'lucide-react';
import type { DnOptionItem, DnStatus } from '../types';
import { DN_STATUS_OPTIONS } from '../utils/dnEnums';

export interface DnSearchFormValues {
  dnNoStart?: string;
  dnNoEnd?: string;
  dnStatus?: DnStatus | null;
  cosId?: number | null;
  dnProfileId?: number | null;
}

interface DnSearchFormProps {
  // 컨텍스트 라벨 (테넌트 / 노드)
  contextLabel?: string;
  profileOptions: DnOptionItem[];
  cosOptions: DnOptionItem[];
  initialValues?: DnSearchFormValues;
  onSearch: (values: DnSearchFormValues) => void;
  onReset?: () => void;
}

export default function DnSearchForm({ contextLabel, profileOptions, cosOptions, initialValues, onSearch, onReset }: DnSearchFormProps) {
  const [values, setValues] = useState<DnSearchFormValues>(initialValues ?? {});

  useEffect(() => {
    setValues(initialValues ?? {});
  }, [initialValues]);

  const updateField = <K extends keyof DnSearchFormValues>(key: K, v: DnSearchFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: v }));
  };

  const handleReset = () => {
    const blank: DnSearchFormValues = {};
    setValues(blank);
    onReset?.();
    onSearch(blank);
  };

  return (
    <div className="bg-white bt-shadow flex items-center gap-3 h-[60px] px-5 flex-shrink-0 flex-wrap">
      {contextLabel && (
        <>
          <span className="text-[13px] font-semibold text-gray-700">{contextLabel}</span>
          <div className="h-4 border-l border-gray-200 mx-1" />
        </>
      )}

      <label className="text-xs text-gray-500 flex-shrink-0">DN 범위</label>
      <Input placeholder="시작" value={values.dnNoStart ?? ''} onChange={(e) => updateField('dnNoStart', e.target.value)} style={{ width: 90 }} size="small" />
      <span className="text-gray-400">~</span>
      <Input placeholder="끝" value={values.dnNoEnd ?? ''} onChange={(e) => updateField('dnNoEnd', e.target.value)} style={{ width: 90 }} size="small" />

      <label className="text-xs text-gray-500 ml-2 flex-shrink-0">상태</label>
      <Select
        value={values.dnStatus ?? null}
        onChange={(v) => updateField('dnStatus', v)}
        options={[{ label: '전체', value: null }, ...DN_STATUS_OPTIONS]}
        style={{ width: 110 }}
        size="small"
        placeholder="전체"
        allowClear
      />

      <label className="text-xs text-gray-500 ml-2 flex-shrink-0">COS</label>
      <Select
        value={values.cosId ?? null}
        onChange={(v) => updateField('cosId', v)}
        options={[{ label: '전체', value: null }, ...cosOptions.map((o) => ({ label: o.name, value: o.id }))]}
        style={{ width: 140 }}
        size="small"
        placeholder="전체"
        allowClear
        showSearch
        optionFilterProp="label"
      />

      <label className="text-xs text-gray-500 ml-2 flex-shrink-0">프로파일</label>
      <Select
        value={values.dnProfileId ?? null}
        onChange={(v) => updateField('dnProfileId', v)}
        options={[{ label: '전체', value: null }, ...profileOptions.map((o) => ({ label: o.name, value: o.id }))]}
        style={{ width: 160 }}
        size="small"
        placeholder="전체"
        allowClear
        showSearch
        optionFilterProp="label"
      />

      <div className="ml-auto flex items-center gap-2">
        <Button type="primary" icon={<Search className="size-3.5" />} onClick={() => onSearch(values)} size="small">
          검색
        </Button>
        <Button icon={<RotateCcw className="size-3.5" />} onClick={handleReset} size="small">
          초기화
        </Button>
      </div>
    </div>
  );
}
