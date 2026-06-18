import { useRef } from 'react';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button } from 'antd';
import { Boxes } from 'lucide-react';
import A2ASkillDrawer, { type A2ASkillDrawerRef } from './A2ASkillDrawer';
import type { A2ASkill } from '../types';
import { IconTrash } from '@/components/custom/Icons';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

/**
 * A2A Skills 편집기 — controlled 컴포넌트.
 *
 * - skills 와 onChange 만 받음. BE 호출은 부모 책임 (생성 시 local state, 수정 시 즉시 update API).
 * - AG-Grid 로 목록 표시 + 더블클릭/추가 버튼으로 A2ASkillDrawer 편집.
 * - 생성·수정 두 흐름에서 동일하게 사용해 UX 일관.
 */
interface Props {
  skills: A2ASkill[];
  onChange: (next: A2ASkill[]) => void;
  loading?: boolean;
  /** 헤더 하단 보조 설명 (예: 자동 채움 안내) */
  description?: string;
}

export default function A2ASkillsEditor({ skills, onChange, loading, description }: Props) {
  const modal = useModal();
  const skillDrawerRef = useRef<A2ASkillDrawerRef>(null);
  const { gridOptions } = useAggridOptions();

  const handleSave = (skill: A2ASkill, isEdit: boolean) => {
    if (isEdit) {
      onChange(skills.map((s) => (s.skillId === skill.skillId ? skill : s)));
      return;
    }
    // 신규 — skillId 가 없는 경우 부모(수정 페이지의 BE 응답) 또는 createA2A 가 부여하기 전까지 임시 id 부여하여 row key 충돌 방지
    const next: A2ASkill = skill.skillId ? skill : { ...skill, skillId: `tmp-${Date.now()}` };
    onChange([...skills, next]);
  };

  const handleDelete = (skill: A2ASkill) => {
    modal.confirm.delete({
      onOk: () => onChange(skills.filter((s) => s.skillId !== skill.skillId)),
    });
  };

  const columnDefs: ColDef<A2ASkill>[] = [
    {
      headerName: 'Skill 명',
      field: 'skillName',
      flex: 1,
      cellStyle: { display: 'flex', alignItems: 'center' },
    },
    {
      headerName: '설명',
      field: 'description',
      flex: 2,
      cellStyle: { display: 'flex', alignItems: 'center' },
      valueFormatter: (params) => params.value ?? '-',
    },
    {
      headerName: 'Tags',
      field: 'tags',
      flex: 1,
      cellStyle: { display: 'flex', alignItems: 'center' },
      valueFormatter: (params) => (Array.isArray(params.value) && params.value.length ? (params.value as string[]).join(', ') : '-'),
    },
    {
      headerName: '',
      maxWidth: 60,
      sortable: false,
      filter: false,
      suppressHeaderMenuButton: true,
      resizable: false,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: (params: ICellRendererParams<A2ASkill>) => {
        const { data } = params;
        if (!data) return null;
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(data);
            }}
          >
            <IconTrash className="size-5 text-red-500 hover:cursor-pointer" />
          </button>
        );
      },
    },
  ];

  return (
    <>
      <div className="flex flex-col w-full h-full">
        <header className="mb-4 flex items-center justify-between gap-2 border-b border-[#F1F3F5] pb-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-bt-primary-soft)]">
              <Boxes className="size-[18px] text-[var(--color-bt-primary)]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-[#495057]">
                Skills
                <span className="ml-1.5 text-xs font-normal text-[#888B9A]">{skills.length}</span>
              </h3>
              <p className="truncate text-xs text-[#888B9A]">{description ?? 'Agent가 외부에 노출할 스킬 목록'}</p>
            </div>
          </div>
          <Button type="primary" onClick={() => skillDrawerRef.current?.open()}>
            추가
          </Button>
        </header>
        <div className="w-full flex-1 min-h-0">
          <AgGridReact<A2ASkill>
            rowData={skills}
            columnDefs={columnDefs}
            // Skills 는 보통 소량(수 ~ 수십 건) 이라 페이지네이션·하단 status bar 제거.
            gridOptions={{ ...gridOptions, statusBar: undefined, pagination: false }}
            getRowId={(params) => params.data.skillId ?? params.data.skillName}
            loading={loading}
            onRowDoubleClicked={(e) => {
              if (e.data) skillDrawerRef.current?.open(e.data);
            }}
          />
        </div>
      </div>

      <A2ASkillDrawer ref={skillDrawerRef} onSave={handleSave} />
    </>
  );
}
