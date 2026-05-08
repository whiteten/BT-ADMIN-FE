import { Button, Card, Empty, Spin, Tag } from 'antd';
import { RefreshCw } from 'lucide-react';

interface Props {
  isLoading?: boolean;
  previewData?: {
    columns: Array<{ name: string; displayName: string }>;
    rows: Array<Record<string, unknown>>;
  } | null;
  onRefresh?: () => void;
}

export default function StepPreview({ isLoading, previewData, onRefresh }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-medium">미리보기</h3>
          <p className="text-sm text-gray-500">실제 데이터로 위젯이 어떻게 표시되는지 확인합니다.</p>
        </div>
        <Button icon={<RefreshCw size={14} />} onClick={onRefresh} loading={isLoading}>
          데이터 조회
        </Button>
      </div>

      <Card>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Spin tip="데이터 조회 중..." />
          </div>
        ) : previewData && previewData.rows.length > 0 ? (
          <div className="overflow-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  {previewData.columns.map((col) => (
                    <th key={col.name} className="border px-3 py-2 text-left font-medium text-gray-700">
                      {col.displayName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.rows.slice(0, 20).map((row, rowIdx) => (
                  <tr key={rowIdx} className="hover:bg-gray-50">
                    {previewData.columns.map((col) => (
                      <td key={col.name} className="border px-3 py-2">
                        {row[col.name] != null ? String(row[col.name]) : '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {previewData.rows.length > 20 && <p className="text-sm text-gray-400 mt-2 text-center">상위 20건 표시 중 (전체 {previewData.rows.length}건)</p>}
          </div>
        ) : (
          <Empty description="'데이터 조회' 버튼을 클릭하여 미리보기를 확인하세요" />
        )}
      </Card>

      <div className="flex gap-2">
        <Tag color="blue">그리드 뷰</Tag>
        <Tag>차트 뷰 (구현 예정)</Tag>
        <Tag>카드 뷰 (구현 예정)</Tag>
      </div>
    </div>
  );
}
