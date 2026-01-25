/**
 * 로그인 이력 Dialog 컴포넌트
 * - shadcn Dialog + forwardRef 패턴
 * - 최근 7일 기본, DatePicker로 기간 조정 가능
 * - 프론트엔드 페이지네이션
 */

import { forwardRef, useCallback, useImperativeHandle, useMemo, useState } from 'react';
import { DatePicker, Table, Tag } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import { History } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/libs/shared-ui/src/lib/utils';

/**
 * 로그인 이력 타입 (간소화)
 */
interface LoginAuditLog {
  logId: string;
  username: string;
  userAccount?: string;
  userId?: number;
  result: 'SUCCESS' | 'FAILURE' | 'LOCKED';
  failureReason?: string;
  clientIp?: string;
  createdAt: string;
}

/**
 * API 응답 타입
 */
interface PagedResponse<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
}

export interface LoginHistoryDialogRef {
  open: (userId: number) => void;
  close: () => void;
}

export interface LoginHistoryDialogProps {
  fetchLoginHistory: (params: { userId: number; startDate: string; endDate: string; size: number }) => Promise<PagedResponse<LoginAuditLog>>;
  className?: string;
}

const { RangePicker } = DatePicker;

/**
 * 로그인 결과 라벨
 */
const LOGIN_RESULT_LABELS: Record<string, string> = {
  SUCCESS: '성공',
  FAILURE: '실패',
  LOCKED: '잠금',
};

/**
 * 로그인 결과 색상
 */
const LOGIN_RESULT_COLORS: Record<string, string> = {
  SUCCESS: 'green',
  FAILURE: 'red',
  LOCKED: 'orange',
};

/**
 * 실패 사유 라벨
 */
const FAILURE_REASON_LABELS: Record<string, string> = {
  USER_NOT_FOUND: '사용자 없음',
  INVALID_PASSWORD: '비밀번호 불일치',
  ACCOUNT_DISABLED: '계정 비활성화',
  ACCOUNT_DORMANT: '휴면 계정',
  ACCOUNT_LOCKED: '계정 잠금',
};

const PAGE_SIZE = 10;

export const LoginHistoryDialog = forwardRef<LoginHistoryDialogRef, LoginHistoryDialogProps>(function LoginHistoryDialog({ fetchLoginHistory, className }, ref) {
  const [isOpen, setIsOpen] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<LoginAuditLog[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([dayjs().subtract(7, 'day'), dayjs()]);

  // 데이터 조회
  const loadData = useCallback(
    async (uid: number, range: [Dayjs, Dayjs]) => {
      setIsLoading(true);
      try {
        const response = await fetchLoginHistory({
          userId: uid,
          startDate: range[0].format('YYYY-MM-DD'),
          endDate: range[1].format('YYYY-MM-DD'),
          size: 9999, // 프론트엔드에서 페이지네이션하므로 전체 데이터 요청
        });
        setData(response.items ?? []);
        setCurrentPage(1);
      } catch {
        setData([]);
      } finally {
        setIsLoading(false);
      }
    },
    [fetchLoginHistory],
  );

  // ref 인터페이스 노출
  useImperativeHandle(
    ref,
    () => ({
      open: (uid: number) => {
        const initialRange: [Dayjs, Dayjs] = [dayjs().subtract(7, 'day'), dayjs()];
        setUserId(uid);
        setDateRange(initialRange);
        setData([]);
        setCurrentPage(1);
        setIsOpen(true);
        loadData(uid, initialRange);
      },
      close: () => {
        setIsOpen(false);
        setData([]);
      },
    }),
    [loadData],
  );

  // 기간 변경 핸들러
  const handleDateRangeChange = useCallback(
    (dates: [Dayjs | null, Dayjs | null] | null) => {
      if (dates?.[0] && dates?.[1] && userId) {
        const newRange: [Dayjs, Dayjs] = [dates[0], dates[1]];
        setDateRange(newRange);
        loadData(userId, newRange);
      }
    },
    [userId, loadData],
  );

  // 테이블 컬럼 정의
  const columns: ColumnsType<LoginAuditLog> = useMemo(
    () => [
      {
        title: '일시',
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 160,
        render: (value: string) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-'),
      },
      {
        title: '결과',
        dataIndex: 'result',
        key: 'result',
        width: 80,
        align: 'center',
        render: (value: string) => <Tag color={LOGIN_RESULT_COLORS[value] ?? 'default'}>{LOGIN_RESULT_LABELS[value] ?? value}</Tag>,
      },
      {
        title: '실패사유',
        dataIndex: 'failureReason',
        key: 'failureReason',
        width: 140,
        render: (value: string) => (value ? (FAILURE_REASON_LABELS[value] ?? value) : '-'),
      },
      {
        title: 'IP',
        dataIndex: 'clientIp',
        key: 'clientIp',
        width: 130,
        render: (value: string) => value ?? '-',
      },
    ],
    [],
  );

  // 프론트엔드 페이지네이션
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return data.slice(start, start + PAGE_SIZE);
  }, [data, currentPage]);

  // 페이지네이션 설정
  const pagination: TablePaginationConfig = useMemo(
    () => ({
      current: currentPage,
      pageSize: PAGE_SIZE,
      total: data.length,
      showSizeChanger: false,
      showTotal: (total) => `총 ${total}건`,
      onChange: (page) => setCurrentPage(page),
    }),
    [currentPage, data.length],
  );

  // Dialog 닫기 핸들러
  const handleClose = useCallback(() => {
    setIsOpen(false);
    setData([]);
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className={cn('sm:max-w-[600px]', className)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-blue-600" />
            로그인 이력
          </DialogTitle>
          <DialogDescription>최근 로그인 시도 기록을 확인합니다.</DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-4">
          {/* 기간 선택 */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-600 shrink-0">조회기간</span>
            <RangePicker
              value={dateRange}
              onChange={handleDateRangeChange}
              disabledDate={(current) => current > dayjs().endOf('day')}
              inputReadOnly
              allowClear={false}
              className="flex-1"
            />
          </div>

          {/* 데이터 테이블 */}
          <Table<LoginAuditLog>
            columns={columns}
            dataSource={paginatedData}
            rowKey="logId"
            loading={isLoading}
            pagination={pagination}
            size="small"
            scroll={{ y: 300 }}
            locale={{ emptyText: '조회된 이력이 없습니다.' }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
});

export default LoginHistoryDialog;
