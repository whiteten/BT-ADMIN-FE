import { Checkbox, Divider, Select } from 'antd';

type SelectOption = {
  label: string;
  value: string;
};

type MultiSelectFieldProps = {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  options: SelectOption[];
  placeholder: string;
  disabled?: boolean;
};

export function MultiSelectField({ label, value, onChange, options, placeholder, disabled = false }: MultiSelectFieldProps) {
  const handleToggleAll = () => {
    if (value.length === options.length) {
      onChange([]);
      return;
    }
    onChange(options.map((option) => option.value));
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-[#495057] shrink-0">{label}</span>
      <Select
        mode="multiple"
        value={value}
        onChange={(nextValue) => onChange(nextValue ?? [])}
        allowClear
        showSearch
        maxTagCount="responsive"
        options={options}
        placeholder={placeholder}
        optionFilterProp="label"
        style={{ width: '15rem' }}
        popupMatchSelectWidth={false}
        disabled={disabled}
        dropdownRender={(menu) => (
          <>
            <div className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50" onMouseDown={(e) => e.preventDefault()} onClick={handleToggleAll}>
              <Checkbox checked={value.length === options.length && options.length > 0} indeterminate={value.length > 0 && value.length < options.length} />
              <span className="text-sm">전체 선택</span>
            </div>
            <Divider style={{ margin: '4px 0' }} />
            {menu}
          </>
        )}
      />
    </div>
  );
}

type CampaignManagementContextHeaderProps = {
  tenantIds: string[];
  onTenantIdsChange: (value: string[]) => void;
  tenantSelectOptions: SelectOption[];
  showCampaignSelect?: boolean;
  campaignSelections?: string[];
  onCampaignSelectionsChange?: (value: string[]) => void;
  campaignSelectOptions?: SelectOption[];
};

export default function CampaignManagementContextHeader({
  tenantIds,
  onTenantIdsChange,
  tenantSelectOptions,
  showCampaignSelect = false,
  campaignSelections = [],
  onCampaignSelectionsChange,
  campaignSelectOptions = [],
}: CampaignManagementContextHeaderProps) {
  return (
    <div className="flex items-center gap-3 w-full bg-white bt-shadow px-7 py-5 flex-wrap">
      <MultiSelectField label="테넌트" value={tenantIds} onChange={onTenantIdsChange} options={tenantSelectOptions} placeholder="테넌트를 선택하세요." />
      {showCampaignSelect && onCampaignSelectionsChange ? (
        <MultiSelectField
          label="캠페인"
          value={campaignSelections}
          onChange={onCampaignSelectionsChange}
          options={campaignSelectOptions}
          placeholder="캠페인을 선택하세요."
          disabled={tenantIds.length === 0}
        />
      ) : null}
    </div>
  );
}
