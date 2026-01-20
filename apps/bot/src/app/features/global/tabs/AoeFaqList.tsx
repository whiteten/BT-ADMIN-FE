import { useEffect, useMemo, useRef, useState } from 'react';
import type { ColDef, ICellRendererParams, RowDoubleClickedEvent } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Input, Select, Tag } from 'antd';
import dayjs from 'dayjs';
import { CircleUserRound } from 'lucide-react';
import { useGetAoeAgents } from '../../bot-config/hooks/useModelQueries';
import AoeFaqDrawer, { type AoeFaqDrawerRef } from '../components/AoeFaqDrawer';
import { IconAlertTriangle, IconTrash } from '@/components/custom/Icons';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

interface AoeFaqItem {
  faqId: string;
  faqEnable: 0 | 1;
  questions: string[];
  answer: string;
  updatedAt: string;
}

const dummyData: AoeFaqItem[] = [
  {
    faqId: '1',
    faqEnable: 1,
    questions: [
      '질문이 길어지면 어떻게 그려질까요?질문이 길어지면 어떻게 그려질까요?질문이 길어지면 어떻게 그려질까요?질문이 길어지면 어떻게 그려질까요?',
      '배송 기간이 어떻게 되나요?',
      '언제 도착하나요?',
    ],
    answer: '일반 배송은 2-3일, 빠른 배송은 당일 또는 익일 도착합니다.',
    updatedAt: '2024-01-20T14:30:00',
  },
  {
    faqId: '2',
    faqEnable: 1,
    questions: ['환불 절차는 어떻게 되나요?', '환불 방법 알려주세요', '환불하고 싶어요', '환불 가능한가요?'],
    answer: '마이페이지에서 환불 신청 후 1-3일 내 처리됩니다.',
    updatedAt: '2024-01-18T11:00:00',
  },
  {
    faqId: '3',
    faqEnable: 0,
    questions: ['회원 가입은 어떻게 하나요?'],
    answer: '홈페이지 우측 상단 회원가입 버튼을 클릭하여 진행할 수 있습니다.',
    updatedAt: '2024-01-15T09:00:00',
  },
  {
    faqId: '4',
    faqEnable: 1,
    questions: ['비밀번호를 잊어버렸어요.', '비밀번호 찾기', '비밀번호 재설정'],
    answer: '로그인 페이지에서 비밀번호 찾기를 통해 재설정할 수 있습니다.',
    updatedAt: '2024-01-16T10:00:00',
  },
  {
    faqId: '5',
    faqEnable: 0,
    questions: ['적립금은 어떻게 사용하나요?', '포인트 사용법'],
    answer: '결제 시 적립금 사용 옵션을 선택하여 사용할 수 있습니다.',
    updatedAt: '2024-01-19T16:00:00',
  },
  {
    faqId: '6',
    faqEnable: 1,
    questions: ['해외 배송이 가능한가요?', '해외로 보내주세요', '외국 배송 되나요?', '미국 배송', '일본 배송'],
    answer: '현재 해외 배송은 지원하지 않습니다.',
    updatedAt: '2024-01-10T10:00:00',
  },
  {
    faqId: '7',
    faqEnable: 1,
    questions: ['교환은 어떻게 신청하나요?', '교환 방법'],
    answer: '마이페이지 > 주문내역에서 교환 신청이 가능합니다.',
    updatedAt: '2024-01-21T15:00:00',
  },
  {
    faqId: '8',
    faqEnable: 0,
    questions: ['결제 수단은 어떤 것이 있나요?'],
    answer: '신용카드, 계좌이체, 카카오페이, 네이버페이를 지원합니다.',
    updatedAt: '2024-01-17T11:00:00',
  },
  {
    faqId: '9',
    faqEnable: 1,
    questions: ['상품 문의는 어디서 하나요?', '문의하기', '질문하고 싶어요'],
    answer: '상품 상세 페이지 하단의 Q&A 탭에서 문의할 수 있습니다.',
    updatedAt: '2024-01-22T14:00:00',
  },
  {
    faqId: '10',
    faqEnable: 0,
    questions: ['쿠폰은 어떻게 적용하나요?', '쿠폰 사용법', '할인 쿠폰', '쿠폰 코드 입력'],
    answer: '결제 페이지에서 쿠폰 코드를 입력하거나 보유 쿠폰을 선택할 수 있습니다.',
    updatedAt: '2024-01-13T13:00:00',
  },
];

export default function AoeFaqList() {
  const { gridOptions } = useAggridOptions();
  const faqDrawerRef = useRef<AoeFaqDrawerRef>(null);

  const [rowData, setRowData] = useState<AoeFaqItem[]>([]);
  const [filterColumn, setFilterColumn] = useState('questions');
  const [searchValue, setSearchValue] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const modal = useModal();

  const handleDelete = (id: string) => {
    modal.confirm.delete({
      onOk: () => {
        // TODO: 삭제 API 연동
        console.log('Delete FAQ:', id);
      },
    });
  };

  const { data: aoeAgents, isLoading: isLoadingAoeAgents } = useGetAoeAgents();

  const columnDefs: ColDef<AoeFaqItem>[] = [
    { field: 'faqId', hide: true },
    {
      headerName: '',
      field: 'faqEnable',
      maxWidth: 50,
      sortable: false,
      filter: false,
      suppressHeaderMenuButton: true,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: (params: { value: 0 | 1 }) => {
        if (params.value === 0) {
          return <IconAlertTriangle className="size-5 text-yellow-500" />;
        }
        return null;
      },
    },
    {
      headerName: '질의문',
      field: 'questions',
      flex: 2,
      cellRenderer: (params: { value: string[] }) => {
        const questions = params.value;
        if (!questions?.length) return '';
        const first = questions[0];
        const rest = questions.length - 1;
        return rest > 0 ? (
          <div className="flex items-center gap-1 w-full overflow-hidden">
            <span className="truncate min-w-0">{first}</span>
            <Tag color="default" className="shrink-0 !rounded-[14px] !text-[#888B9A]">
              +{rest}
            </Tag>
          </div>
        ) : (
          first
        );
      },
    },
    { headerName: '답변', field: 'answer', flex: 2 },
    {
      headerName: '수정일',
      field: 'updatedAt',
      maxWidth: 180,
      valueFormatter: (params: { value: string }) => (params.value ? dayjs(params.value).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
    {
      maxWidth: 80,
      sortable: false,
      filter: false,
      suppressHeaderMenuButton: true,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: (params: ICellRendererParams<AoeFaqItem>) => {
        const { data } = params;
        if (!data) return null;
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(data.faqId);
            }}
          >
            <IconTrash className="size-5 text-red-500 hover:cursor-pointer" />
          </button>
        );
      },
    },
  ];

  const filteredList = useMemo(() => {
    if (!searchValue.trim()) return dummyData;
    const keyword = searchValue.toLowerCase();
    return dummyData.filter((item) => {
      if (filterColumn === 'questions') {
        return item.questions.some((q) => q.toLowerCase().includes(keyword));
      }
      const value = item[filterColumn as keyof AoeFaqItem];
      return String(value).toLowerCase().includes(keyword);
    });
  }, [filterColumn, searchValue]);

  useEffect(() => {
    setRowData(filteredList);
  }, [filteredList]);

  return (
    <div className="flex flex-col gap-5 w-full h-full">
      <header className="flex items-center justify-between w-full gap-2 lg:flex-nowrap flex-wrap">
        <div className="flex items-center w-full gap-3">
          <Select
            value={selectedAgentId ?? null}
            onChange={(value) => {
              setSelectedAgentId(value);
            }}
            options={aoeAgents?.map((agent) => ({ label: agent.agentName, value: agent.agentId })) ?? []}
            showSearch={{ optionFilterProp: 'label' }}
            placeholder="FAQ Agent를 선택하세요."
            popupMatchSelectWidth={false}
            loading={isLoadingAoeAgents}
            prefix={<CircleUserRound className="size-4 text-gray-500" />}
            className="!max-w-[250px] !min-w-[200px]"
          />
          <Select
            defaultValue="questions"
            value={filterColumn}
            onChange={(value) => {
              setFilterColumn(value);
              setSearchValue('');
            }}
            options={[
              { label: '질의문', value: 'questions' },
              { label: '답변', value: 'answer' },
            ]}
            className="!max-w-[150px] !min-w-[120px]"
          />
          <Input value={searchValue} onChange={(e) => setSearchValue(e.target.value)} placeholder="검색어를 입력하세요." className="w-full lg:max-w-[400px]" />
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="solid" color="primary" onClick={() => faqDrawerRef.current?.open({})}>
            추가
          </Button>
          <Button variant="solid" color="cyan">
            적용
          </Button>
        </div>
      </header>

      <div className="w-full h-full">
        <AgGridReact<AoeFaqItem>
          rowData={rowData}
          columnDefs={columnDefs}
          gridOptions={gridOptions}
          onRowDoubleClicked={(event: RowDoubleClickedEvent<AoeFaqItem>) => {
            if (event.data) {
              faqDrawerRef.current?.open({ faqData: event.data });
            }
          }}
        />
      </div>

      <AoeFaqDrawer
        ref={faqDrawerRef}
        onSave={(data, isEditMode) => {
          console.log('Save FAQ:', data, 'Edit mode:', isEditMode);
        }}
        onDelete={(faqId) => {
          console.log('Delete FAQ:', faqId);
        }}
      />
    </div>
  );
}
