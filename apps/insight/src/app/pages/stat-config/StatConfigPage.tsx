/**
 * 통계 설정 (TB_BT_IS_STAT_CONFIG) — v3.1 (D71/D99).
 *
 * 보고서 동작에 적용되는 통계 글로벌 정책 관리 화면.
 * 벤치마크: 계정 보안 정책(AccountPolicy) — 좌측 탭별 설정 카드 + 우측 요약 패널.
 * 탭마다 따로 저장(탭 이동 시 미저장 변경은 DB 값으로 리셋).
 *
 *  ① 조회 기간 제한(TIMEUNIT_LIMIT)
 *  ② 표시 형식(FORMAT — DECIMAL_PLACES / THOUSANDS_SEP / LOCALE)
 *  ③ 쿼리 전략(QUERY_STRATEGY — ROUTING_MODE)
 */

import React, { useEffect, useMemo, useState } from 'react';
import { type BreadcrumbProps, Button, Form, InputNumber, Radio, Select, Switch } from 'antd';
import { AlignLeft, Check, Clock, GitBranch, Globe, Hash } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { useGetStatConfigs, useSaveStatConfigs } from '../../features/stat-config/hooks/useStatConfigQueries';
import {
  DEFAULT_FORMAT,
  DEFAULT_QUERY_STRATEGY,
  DEFAULT_TIME_UNIT_LIMIT,
  type FormatForm,
  LOCALE_OPTIONS,
  type QueryStrategyForm,
  ROUTING_MODE_OPTIONS,
  type StatConfigCategory,
  type StatConfigItem,
  type StatConfigSaveItem,
  TIME_UNIT_METAS,
  type TimeUnitLimitForm,
} from '../../features/stat-config/types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { cn } from '@/lib/utils';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '통계', path: '/insight/statistics/stat-config' },
  { title: '통계 설정', path: '/insight/statistics/stat-config' },
];

type TabKey = 'timeunit' | 'format' | 'query';

/** 전체 폼 값(3개 카테고리 통합). */
interface StatConfigFormValues extends TimeUnitLimitForm, FormatForm, QueryStrategyForm {}

const DEFAULTS: StatConfigFormValues = {
  ...DEFAULT_TIME_UNIT_LIMIT,
  ...DEFAULT_FORMAT,
  ...DEFAULT_QUERY_STRATEGY,
};

/** 탭별 폼 필드 매핑 — 저장/검증 범위. */
const TAB_FIELDS: Record<TabKey, (keyof StatConfigFormValues)[]> = {
  timeunit: ['MI', 'HH', 'DD', 'MM', 'YY'],
  format: ['decimalPlaces', 'thousandsSep', 'locale'],
  query: ['routingMode'],
};

/** 응답 → 통합 폼 값. */
function toFormValues(items: StatConfigItem[]): StatConfigFormValues {
  const v: StatConfigFormValues = { ...DEFAULTS };
  for (const item of items) {
    const raw = item.configValue?.trim() ?? '';
    if (item.configCategory === 'TIMEUNIT_LIMIT') {
      const key = item.configKey as keyof TimeUnitLimitForm;
      if (key in DEFAULT_TIME_UNIT_LIMIT) v[key] = raw ? Number.parseInt(raw, 10) || 0 : 0;
    } else if (item.configCategory === 'FORMAT') {
      if (item.configKey === 'DECIMAL_PLACES') v.decimalPlaces = raw ? Number.parseInt(raw, 10) || 0 : 0;
      else if (item.configKey === 'THOUSANDS_SEP') v.thousandsSep = raw.toLowerCase() === 'true';
      else if (item.configKey === 'LOCALE') v.locale = raw || DEFAULT_FORMAT.locale;
    } else if (item.configCategory === 'QUERY_STRATEGY') {
      if (item.configKey === 'ROUTING_MODE') v.routingMode = (raw as QueryStrategyForm['routingMode']) || DEFAULT_QUERY_STRATEGY.routingMode;
    }
  }
  return v;
}

/** 탭 폼 값 → 저장 항목. */
function toSaveItems(tab: TabKey, v: StatConfigFormValues): StatConfigSaveItem[] {
  if (tab === 'timeunit') {
    return TIME_UNIT_METAS.map((m) => ({
      configCategory: 'TIMEUNIT_LIMIT' as StatConfigCategory,
      configKey: m.code,
      configValue: String(v[m.code] ?? 0),
      valueType: 'NUMBER',
      description: m.description,
    }));
  }
  if (tab === 'format') {
    return [
      { configCategory: 'FORMAT', configKey: 'DECIMAL_PLACES', configValue: String(v.decimalPlaces ?? 0), valueType: 'NUMBER', description: '기본 소수점 자릿수' },
      { configCategory: 'FORMAT', configKey: 'THOUSANDS_SEP', configValue: v.thousandsSep ? 'true' : 'false', valueType: 'STRING', description: '천단위 콤마 사용' },
      { configCategory: 'FORMAT', configKey: 'LOCALE', configValue: v.locale, valueType: 'STRING', description: '기본 로캘' },
    ];
  }
  return [
    { configCategory: 'QUERY_STRATEGY', configKey: 'ROUTING_MODE', configValue: v.routingMode, valueType: 'STRING', description: '쿼리 라우팅 모드 (PREFER_POSTFIX/MI_ONLY)' },
  ];
}

/** 0 또는 floor 이상만 허용하는 antd 검증 규칙. */
function limitRule(floor: number) {
  return {
    validator(_: unknown, value: number | null) {
      if (value === null || value === undefined || Number.isNaN(value)) return Promise.reject(new Error('값을 입력하세요'));
      if (value < 0 || !Number.isInteger(value)) return Promise.reject(new Error('0 이상의 정수'));
      if (value !== 0 && value < floor) return Promise.reject(new Error(`0(제한 없음) 또는 ${floor}일 이상`));
      return Promise.resolve();
    },
  };
}

// ─── 공통 설정 카드 ──────────────────────────────────────────────────────────

interface SettingCardProps {
  label: React.ReactNode;
  description: string;
  icon?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

function SettingCard({ label, description, icon, className, children }: SettingCardProps) {
  return (
    <div className={cn('group relative rounded-lg border border-gray-100 bg-gray-50/50 p-4 transition-all hover:border-gray-200 hover:bg-white', className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {icon && (
            <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 group-hover:border-blue-200 group-hover:text-blue-600 transition-colors">
              {icon}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-900 mb-0.5">{label}</div>
            <div className="text-sm text-gray-500 leading-relaxed">{description}</div>
          </div>
        </div>
        <div className="flex-shrink-0">{children}</div>
      </div>
    </div>
  );
}

/** 우측 요약 한 줄. */
function SummaryRow({ label, value, active }: { label: string; value: React.ReactNode; active?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className={cn('font-medium', active !== undefined ? (active ? 'text-emerald-600' : 'text-gray-400') : 'text-gray-900')}>
        {active !== undefined ? (
          <span className="flex items-center gap-1.5">
            {active ? <Check className="w-3.5 h-3.5" /> : null}
            {value}
          </span>
        ) : (
          value
        )}
      </span>
    </div>
  );
}

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'timeunit', label: '조회 기간 제한', icon: <Clock className="h-5 w-5" /> },
  { key: 'format', label: '표시 형식', icon: <AlignLeft className="h-5 w-5" /> },
  { key: 'query', label: '쿼리 전략', icon: <GitBranch className="h-5 w-5" /> },
];

export default function StatConfigPage() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const [form] = Form.useForm<StatConfigFormValues>();
  const watched = Form.useWatch([], form);
  const [activeTab, setActiveTab] = useState<TabKey>('timeunit');

  const { data: configs = [], isLoading } = useGetStatConfigs();
  const initialValues = useMemo(() => toFormValues(configs), [configs]);

  useEffect(() => {
    form.setFieldsValue(initialValues);
  }, [initialValues, form]);

  const { mutate: save, isPending } = useSaveStatConfigs({
    mutationOptions: {
      onSuccess: () => toast.success('통계 설정이 저장되었습니다.'),
      onError: () => toast.error('저장에 실패했습니다.'),
    },
  });

  /** 탭 이동 시 미저장 변경 폐기(DB 값으로 리셋). */
  const handleTabChange = (next: TabKey) => {
    form.setFieldsValue(initialValues);
    setActiveTab(next);
  };

  const handleSave = async () => {
    try {
      await form.validateFields(TAB_FIELDS[activeTab] as string[]);
      const values = form.getFieldsValue(true) as StatConfigFormValues;
      save({ configs: toSaveItems(activeTab, values) });
    } catch {
      toast.error('입력값을 확인해주세요.');
    }
  };

  const current = watched ?? initialValues;

  if (isLoading) {
    return <FallbackSpinner />;
  }

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex flex-1 min-h-0 gap-4">
        {/* 좌: 설정 폼 */}
        <div className="flex-1 min-w-0 bg-white bt-shadow flex flex-col">
          <Form form={form} initialValues={DEFAULTS} className="flex flex-col h-full">
            {/* 탭 헤더 — AccountPolicy(PageTabs/UserDetail) 스타일 */}
            <div className="flex w-full h-[58px] min-h-[58px] bg-white border-b border-[#E9EBEC]">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => handleTabChange(t.key)}
                  className={cn(
                    'w-auto h-full px-4 inline-flex items-center cursor-pointer border border-transparent border-r-[#E9EBEC] text-[#495057] transition-colors',
                    activeTab === t.key && 'border-b-2 border-b-[var(--color-bt-primary)] text-[var(--color-bt-primary)] font-semibold',
                  )}
                >
                  <div className="flex items-center justify-center gap-2 min-w-[150px]">
                    {t.icon}
                    <span>{t.label}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* 탭 콘텐츠 */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* ① 조회 기간 제한 */}
              {activeTab === 'timeunit' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">시간 단위별 최대 조회 기간</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {TIME_UNIT_METAS.map((m) => (
                        <SettingCard
                          key={m.code}
                          icon={<span className="font-bold text-sm">{m.symbol}</span>}
                          label={
                            <>
                              {m.label} <span className="text-xs text-gray-400 font-mono">({m.code})</span>
                            </>
                          }
                          description={m.description}
                        >
                          <div className="flex items-center gap-2">
                            <Form.Item name={m.code} className="!mb-0" rules={[limitRule(m.floor)]}>
                              <InputNumber min={0} className="!w-24" size="middle" />
                            </Form.Item>
                            <span className="text-sm text-gray-500">일</span>
                          </div>
                        </SettingCard>
                      ))}
                    </div>
                  </div>
                  <div className="border border-gray-200 border-l-4 border-l-[var(--color-bt-primary)] bg-blue-50/40 rounded-lg p-4 text-xs leading-relaxed text-gray-600">
                    <div className="font-semibold text-gray-800 mb-1.5">구현 의도 · 데이터 출처</div>
                    <ul className="list-disc ml-4 space-y-1">
                      <li>
                        보고서 화면에서 선택한 시간 단위에 따라 검색 가능한 <b>날짜 범위 상한(일)</b>을 정합니다. 과도한 기간 조회로 인한 조회 부하 방지 가드.
                      </li>
                      <li>
                        <b>0 = 제한 없음</b>. 그 외에는 단위 최소폭(분·시·일 ≥ 1, 월 ≥ 31, 년 ≥ 366) 이상만 허용.
                      </li>
                      <li>
                        출처: <span className="font-mono">TB_BT_IS_STAT_CONFIG · CONFIG_CATEGORY='TIMEUNIT_LIMIT'</span>.
                      </li>
                    </ul>
                  </div>
                </div>
              )}

              {/* ② 표시 형식 */}
              {activeTab === 'format' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">숫자 표시 기본값</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      <SettingCard icon={<span className="font-bold text-sm">.0</span>} label="소수점 자릿수" description="측정값 기본 소수점 자릿수 (DECIMAL_PLACES)">
                        <Form.Item name="decimalPlaces" className="!mb-0" rules={[{ required: true, message: '값을 입력하세요' }]}>
                          <InputNumber min={0} max={6} className="!w-24" size="middle" />
                        </Form.Item>
                      </SettingCard>
                      <SettingCard icon={<Hash className="w-4 h-4" />} label="천단위 구분" description="1,234 형식 콤마 사용 (THOUSANDS_SEP)">
                        <Form.Item name="thousandsSep" valuePropName="checked" className="!mb-0">
                          <Switch />
                        </Form.Item>
                      </SettingCard>
                      <SettingCard className="lg:col-span-2" icon={<Globe className="w-4 h-4" />} label="로캘" description="기본 표시 로캘 (LOCALE)">
                        <Form.Item name="locale" className="!mb-0">
                          <Select options={LOCALE_OPTIONS} className="!w-44" size="middle" />
                        </Form.Item>
                      </SettingCard>
                    </div>
                  </div>
                  <div className="border border-gray-200 border-l-4 border-l-[var(--color-bt-primary)] bg-blue-50/40 rounded-lg p-4 text-xs leading-relaxed text-gray-600">
                    <div className="font-semibold text-gray-800 mb-1.5">구현 의도 · 데이터 출처</div>
                    <ul className="list-disc ml-4 space-y-1">
                      <li>
                        보고서/패널의 숫자 측정값을 화면에 표시할 때의 기본 포맷. 소비처 <span className="font-mono">GlobalFormatPolicy</span>.
                      </li>
                      <li>
                        출처: <span className="font-mono">TB_BT_IS_STAT_CONFIG · CONFIG_CATEGORY='FORMAT'</span> (DECIMAL_PLACES / THOUSANDS_SEP / LOCALE).
                      </li>
                    </ul>
                  </div>
                </div>
              )}

              {/* ③ 쿼리 전략 */}
              {activeTab === 'query' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">쿼리 라우팅 모드</h3>
                    <div className="group relative rounded-lg border border-gray-100 bg-gray-50/50 p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500">
                          <GitBranch className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 mb-1">집계 테이블 라우팅 (ROUTING_MODE)</div>
                          <div className="text-sm text-gray-500 mb-4">통계 쿼리 실행 시 사전집계 테이블 사용 전략을 선택합니다.</div>
                          <Form.Item name="routingMode" className="!mb-0">
                            <Radio.Group className="!flex !flex-col gap-4 w-full">
                              {ROUTING_MODE_OPTIONS.map((o) => (
                                <Radio key={o.value} value={o.value} className="!items-start !m-0">
                                  <div className="ml-1">
                                    <div className="font-medium text-gray-900 font-mono">{o.label}</div>
                                    <div className="text-sm text-gray-500 mt-0.5">{o.description}</div>
                                  </div>
                                </Radio>
                              ))}
                            </Radio.Group>
                          </Form.Item>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="border border-gray-200 border-l-4 border-l-[var(--color-bt-primary)] bg-blue-50/40 rounded-lg p-4 text-xs leading-relaxed text-gray-600">
                    <div className="font-semibold text-gray-800 mb-1.5">구현 의도 · 데이터 출처</div>
                    <ul className="list-disc ml-4 space-y-1">
                      <li>
                        소비처 <span className="font-mono">DatasetQueryEngine</span>. PREFER_POSTFIX는 단위별 사전집계 테이블 우선(빠름), MI_ONLY는 분 원천만 사용(정확·느림).
                      </li>
                      <li>
                        출처: <span className="font-mono">TB_BT_IS_STAT_CONFIG · CONFIG_CATEGORY='QUERY_STRATEGY'</span> (ROUTING_MODE).
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* 하단 저장 */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
              <div className="flex justify-center">
                <Button type="primary" onClick={handleSave} loading={isPending}>
                  저장
                </Button>
              </div>
            </div>
          </Form>
        </div>

        {/* 우: 설정 요약 */}
        <aside className="hidden xl:flex w-[320px] min-w-[320px] flex-col">
          <div className="bg-white bt-shadow rounded-lg p-5">
            <div className="text-base font-bold text-gray-900">설정 요약</div>
            <div className="text-xs text-gray-500 mb-3">현재 적용된 정책</div>

            {/* 조회 기간 제한 */}
            <div className="flex items-center gap-2 mb-1.5">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">조회 기간 제한</span>
            </div>
            <div className="divide-y divide-gray-100">
              {TIME_UNIT_METAS.map((m) => {
                const v = current?.[m.code] ?? 0;
                return <SummaryRow key={m.code} label={m.label} value={v === 0 ? '0일 · 제한 없음' : `${v.toLocaleString()}일`} active={v === 0 ? true : undefined} />;
              })}
            </div>

            {/* 표시 형식 */}
            <div className="flex items-center gap-2 mt-4 mb-1.5 pt-3 border-t border-gray-100">
              <AlignLeft className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">표시 형식</span>
            </div>
            <div className="divide-y divide-gray-100">
              <SummaryRow label="소수점 자릿수" value={`${current?.decimalPlaces ?? 0}자리`} />
              <SummaryRow label="천단위 구분" value="사용" active={!!current?.thousandsSep} />
              <SummaryRow label="로캘" value={current?.locale ?? DEFAULT_FORMAT.locale} />
            </div>

            {/* 쿼리 전략 */}
            <div className="flex items-center gap-2 mt-4 mb-1.5 pt-3 border-t border-gray-100">
              <GitBranch className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">쿼리 전략</span>
            </div>
            <div className="divide-y divide-gray-100">
              <SummaryRow label="라우팅 모드" value={current?.routingMode ?? DEFAULT_QUERY_STRATEGY.routingMode} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
