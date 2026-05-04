import { useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button } from 'antd';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import A2ASkillDrawer, { type A2ASkillDrawerRef } from '../components/A2ASkillDrawer';
import { a2aQueryKeys, useGetA2AList, useUpdateA2A } from '../hooks/useA2aQueries';
import type { A2ASkill } from '../types';
import { IconTrash } from '@/components/custom/Icons';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

export default function A2ASkillList() {
  const { a2aId } = useParams();
  const queryClient = useQueryClient();
  const modal = useModal();
  const skillDrawerRef = useRef<A2ASkillDrawerRef>(null);
  const { gridOptions } = useAggridOptions();

  const { data: a2aList = [], isFetching } = useGetA2AList();
  const a2a = a2aList.find((a) => a.a2aId === a2aId);
  const skills = a2a?.skills ?? [];

  const { mutate: updateA2A } = useUpdateA2A({
    mutationOptions: {
      onSuccess: () => {
        toast.success('저장되었습니다.');
        queryClient.invalidateQueries({ queryKey: a2aQueryKeys.getA2AList().queryKey });
      },
      onError: (error) => Log.warn('updateA2A failed', error),
    },
  });

  const applySkills = (newSkills: A2ASkill[]) => {
    updateA2A({
      params: { a2aId: a2aId ?? '' },
      data: {
        a2aId: a2aId ?? '',
        agentName: a2a?.agentName ?? '',
        agentDescription: a2a?.agentDescription,
        skills: newSkills,
      },
    });
  };

  const handleSave = (skill: A2ASkill, isEdit: boolean) => {
    const newSkills = isEdit ? skills.map((s) => (s.skillId === skill.skillId ? skill : s)) : [...skills, skill];
    applySkills(newSkills);
  };

  const handleDelete = (skill: A2ASkill) => {
    modal.confirm.delete({
      onOk: () => applySkills(skills.filter((s) => s.skillId !== skill.skillId)),
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
      <div className="flex flex-col gap-4 w-full h-full">
        <header className="flex items-center justify-end w-full">
          <Button type="primary" onClick={() => skillDrawerRef.current?.open()}>
            추가
          </Button>
        </header>
        <div className="w-full h-full">
          <AgGridReact<A2ASkill>
            rowData={skills}
            columnDefs={columnDefs}
            gridOptions={gridOptions}
            getRowId={(params) => params.data.skillId ?? params.data.skillName}
            loading={isFetching}
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
