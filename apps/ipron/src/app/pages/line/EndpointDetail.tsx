/**
 * 국선 상세 페이지 — 멤버/인증번호 탭
 * 수정 페이지에서 하단 또는 별도 탭으로 접근하는 것이 아니라,
 * /ipron/line/endpoint/:id/detail 로 직접 접근하여
 * 멤버와 인증번호를 관리하는 페이지.
 *
 * 또는 EndpointForm 하단에 임베드하여 사용할 수도 있음.
 * 현재는 독립 페이지로 구현.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Empty, Tabs } from 'antd';
import { ArrowLeft, Plus } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import EndpointMemberDrawer, { type EndpointMemberDrawerRef } from '../../features/endpoint/components/EndpointMemberDrawer';
import EndpointRegnumDrawer, { type EndpointRegnumDrawerRef } from '../../features/endpoint/components/EndpointRegnumDrawer';
import { endpointQueryKeys, useDeleteMember, useDeleteRegnum, useGetEndpointDetail, useGetMembers, useGetRegnums } from '../../features/endpoint/hooks/useEndpointQueries';
import { type EndpointMember, type EndpointRegnum, TRANSPORT_OPTIONS } from '../../features/endpoint/types';
import { IconTrash } from '@/components/custom/Icons';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [{ title: '회선관리' }, { title: '국선관리', href: '/ipron/line/endpoint' }, { title: '상세' }];

export default function EndpointDetail() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { gridOptions } = useAggridOptions();
  const modal = useModal();

  const endptId = id ? Number(id) : 0;

  // ─── Refs ──────────────────────────────────────────────────────────────────
  const memberDrawerRef = useRef<EndpointMemberDrawerRef>(null);
  const regnumDrawerRef = useRef<EndpointRegnumDrawerRef>(null);

  // ─── State ─────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('members');

  // ─── Queries ───────────────────────────────────────────────────────────────
  const { data: endpointDetail } = useGetEndpointDetail({
    params: { id: endptId },
    queryOptions: { enabled: !!endptId },
  });

  const { data: members = [], isLoading: isMembersLoading } = useGetMembers({
    params: { id: endptId },
    queryOptions: { enabled: !!endptId },
  });

  const { data: regnums = [], isLoading: isRegnumsLoading } = useGetRegnums({
    params: { id: endptId },
    queryOptions: { enabled: !!endptId },
  });

  // ─── Invalidate ────────────────────────────────────────────────────────────
  const invalidateMembers = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: endpointQueryKeys.getMembers({ id: endptId }).queryKey });
  }, [queryClient, endptId]);

  const invalidateRegnums = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: endpointQueryKeys.getRegnums({ id: endptId }).queryKey });
  }, [queryClient, endptId]);

  // ─── Mutations ─────────────────────────────────────────────────────────────
  const { mutate: deleteMember } = useDeleteMember({
    mutationOptions: {
      onSuccess: () => {
        toast.success('멤버가 삭제되었습니다.');
        invalidateMembers();
      },
    },
  });

  const { mutate: deleteRegnum } = useDeleteRegnum({
    mutationOptions: {
      onSuccess: () => {
        toast.success('인증번호가 삭제되었습니다.');
        invalidateRegnums();
      },
    },
  });

  // ─── Transport label ──────────────────────────────────────────────────────
  const getTransportLabel = (val: number | string) => {
    const found = TRANSPORT_OPTIONS.find((o) => o.value === Number(val));
    return found?.label ?? val;
  };

  // ─── Member columns ──────────────────────────────────────────────────────
  const memberColumnDefs: ColDef<EndpointMember>[] = useMemo(
    () => [
      { headerName: '멤버명', field: 'endptMemName', flex: 1, sortable: true },
      { headerName: 'IP', field: 'ipAddress', maxWidth: 160, sortable: true },
      { headerName: 'PORT', field: 'portNo', maxWidth: 80, sortable: true },
      {
        headerName: '전송방식',
        maxWidth: 100,
        cellRenderer: (params: { data?: EndpointMember }) => (params.data ? getTransportLabel(params.data.transportType) : ''),
      },
      { headerName: '우선순위', field: 'priority', maxWidth: 90, sortable: true },
      {
        headerName: '차단',
        field: 'blockYn',
        maxWidth: 70,
        cellRenderer: (params: ICellRendererParams) => (params.value === 1 ? <span className="text-red-500 font-medium">차단</span> : <span className="text-green-600">정상</span>),
      },
      {
        headerName: '',
        maxWidth: 60,
        sortable: false,
        filter: false,
        suppressHeaderMenuButton: true,
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
        cellRenderer: (params: ICellRendererParams<EndpointMember>) => {
          const { data } = params;
          if (!data) return null;
          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                modal.confirm.execute({
                  onOk: () => deleteMember({ id: endptId, memId: data.endptMemId }),
                  options: { title: '멤버 삭제', content: `"${data.endptMemName}" 멤버를 삭제하시겠습니까?` },
                });
              }}
            >
              <IconTrash className="size-5 text-red-500 hover:cursor-pointer" />
            </button>
          );
        },
      },
    ],
    [endptId, deleteMember, modal],
  );

  // ─── Regnum columns ──────────────────────────────────────────────────────
  const regnumColumnDefs: ColDef<EndpointRegnum>[] = useMemo(
    () => [
      { headerName: '인증번호', field: 'regNum', flex: 1, sortable: true },
      { headerName: '인증 ID', field: 'regMd5Id', maxWidth: 160, sortable: true },
      { headerName: '간격 (초)', field: 'regInterval', maxWidth: 90, sortable: true },
      { headerName: '테넌트', field: 'tenantName', maxWidth: 140, valueFormatter: (p) => p.value ?? '-' },
      {
        headerName: '활성',
        field: 'regActivateYn',
        maxWidth: 70,
        cellRenderer: (params: ICellRendererParams) => (params.value === 1 ? <span className="text-green-600">활성</span> : <span className="text-gray-400">비활성</span>),
      },
      { headerName: '만료일', field: 'expireDate', maxWidth: 120, valueFormatter: (p) => p.value ?? '-' },
      {
        headerName: '',
        maxWidth: 60,
        sortable: false,
        filter: false,
        suppressHeaderMenuButton: true,
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
        cellRenderer: (params: ICellRendererParams<EndpointRegnum>) => {
          const { data } = params;
          if (!data) return null;
          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                modal.confirm.execute({
                  onOk: () => deleteRegnum({ id: endptId, regId: data.endptRegnumId }),
                  options: { title: '인증번호 삭제', content: `"${data.regNum}" 인증번호를 삭제하시겠습니까?` },
                });
              }}
            >
              <IconTrash className="size-5 text-red-500 hover:cursor-pointer" />
            </button>
          );
        },
      },
    ],
    [endptId, deleteRegnum, modal],
  );

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-2 w-full h-[76px] bg-white bt-shadow px-7 py-5">
        <div className="flex items-center gap-3">
          <Button icon={<ArrowLeft className="size-4" />} onClick={() => navigate('/ipron/line/endpoint')}>
            목록
          </Button>
          {endpointDetail && (
            <>
              <span className="w-px h-5 bg-gray-300" />
              <span className="text-base font-semibold text-gray-800">{endpointDetail.endptName}</span>
              <span className="text-sm text-gray-500">({endpointDetail.nodeName})</span>
            </>
          )}
        </div>
        <Button type="primary" onClick={() => navigate(`/ipron/line/endpoint/${endptId}`)}>
          국선 수정
        </Button>
      </div>

      {/* Tabs: Members / Regnums */}
      <div className="flex-1 min-h-0 bg-white bt-shadow flex flex-col overflow-hidden">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          className="h-full flex flex-col [&_.ant-tabs-content]:flex-1 [&_.ant-tabs-content]:min-h-0 [&_.ant-tabs-tabpane]:h-full"
          tabBarStyle={{ paddingLeft: 20, paddingRight: 20, marginBottom: 0 }}
          tabBarExtraContent={
            <Button
              type="primary"
              size="small"
              icon={<Plus className="size-3.5" />}
              onClick={() => {
                if (activeTab === 'members') {
                  memberDrawerRef.current?.open();
                } else {
                  regnumDrawerRef.current?.open();
                }
              }}
            >
              {activeTab === 'members' ? '멤버 추가' : '인증번호 추가'}
            </Button>
          }
          items={[
            {
              key: 'members',
              label: `멤버 (${members.length})`,
              children: (
                <div className="h-full">
                  {members.length === 0 && !isMembersLoading ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
                      <Empty description={false} />
                      <span className="text-sm">등록된 멤버가 없습니다</span>
                    </div>
                  ) : (
                    <AgGridReact<EndpointMember>
                      rowData={members}
                      columnDefs={memberColumnDefs}
                      gridOptions={gridOptions}
                      loading={isMembersLoading}
                      onRowClicked={(e) => {
                        if (e.data) memberDrawerRef.current?.open(e.data);
                      }}
                    />
                  )}
                </div>
              ),
            },
            {
              key: 'regnums',
              label: `인증번호 (${regnums.length})`,
              children: (
                <div className="h-full">
                  {regnums.length === 0 && !isRegnumsLoading ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
                      <Empty description={false} />
                      <span className="text-sm">등록된 인증번호가 없습니다</span>
                    </div>
                  ) : (
                    <AgGridReact<EndpointRegnum>
                      rowData={regnums}
                      columnDefs={regnumColumnDefs}
                      gridOptions={gridOptions}
                      loading={isRegnumsLoading}
                      onRowClicked={(e) => {
                        if (e.data) regnumDrawerRef.current?.open(e.data);
                      }}
                    />
                  )}
                </div>
              ),
            },
          ]}
        />
      </div>

      {/* Drawers */}
      <EndpointMemberDrawer ref={memberDrawerRef} endptId={endptId} onSuccess={invalidateMembers} />
      <EndpointRegnumDrawer ref={regnumDrawerRef} endptId={endptId} onSuccess={invalidateRegnums} />
    </div>
  );
}
