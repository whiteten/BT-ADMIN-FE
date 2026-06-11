import { Table } from 'antd';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CHART_COLORS } from '../constants/chatConstants';
import { CHAT_VIEW_TYPE, type ChatResponseBlock } from '../types';

interface ChatResponseContentProps {
  block: ChatResponseBlock;
}

/** 응답 블록 1개의 말풍선 내용 — answer 문장 + viewType 에 따른 차트/표 (말풍선 분할은 ChatMessageList 담당) */
export default function ChatResponseContent({ block }: ChatResponseContentProps) {
  const data = block.data ?? [];
  const tableData = block.tableData ?? [];

  const renderGraph = () => {
    switch (block.viewType) {
      case CHAT_VIEW_TYPE.PIE: {
        if (!data.length) return null;
        return (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" outerRadius={85} label>
                {data.map((datum, index) => (
                  <Cell key={datum.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        );
      }
      case CHAT_VIEW_TYPE.BAR: {
        if (!data.length) return null;
        return (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data} margin={{ top: 8, right: 8, left: block.yTitle ? 8 : -8, bottom: block.xTitle ? 16 : 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} label={block.xTitle ? { value: block.xTitle, position: 'insideBottom', offset: -12, fontSize: 11 } : undefined} />
              <YAxis
                tick={{ fontSize: 12 }}
                label={block.yTitle ? { value: block.yTitle, angle: -90, position: 'insideLeft', fontSize: 11, style: { textAnchor: 'middle' } } : undefined}
              />
              <Tooltip />
              <Bar dataKey="value" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        );
      }
      case CHAT_VIEW_TYPE.LINE: {
        if (!data.length) return null;
        return (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data} margin={{ top: 8, right: 8, left: block.yTitle ? 8 : -8, bottom: block.xTitle ? 16 : 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} label={block.xTitle ? { value: block.xTitle, position: 'insideBottom', offset: -12, fontSize: 11 } : undefined} />
              <YAxis
                tick={{ fontSize: 12 }}
                label={block.yTitle ? { value: block.yTitle, angle: -90, position: 'insideLeft', fontSize: 11, style: { textAnchor: 'middle' } } : undefined}
              />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke={CHART_COLORS[0]} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        );
      }
      case CHAT_VIEW_TYPE.TABLE: {
        // tableData 는 2차원 배열, 첫 행이 컬럼 헤더
        const [header, ...rows] = tableData;
        if (!header?.length) return null;
        return (
          <Table
            size="small"
            pagination={false}
            columns={header.map((title, colIndex) => ({ title: String(title), dataIndex: colIndex, key: colIndex }))}
            dataSource={rows.map((row, rowIndex) => ({ ...row, key: rowIndex }))}
          />
        );
      }
      default:
        return null;
    }
  };

  const graph = renderGraph();

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] text-slate-700 leading-relaxed break-all whitespace-pre-wrap">{block.answer}</p>
      {graph && (
        <div className="w-[440px] max-w-full">
          {block.viewTitle && <p className="mb-1 text-xs font-medium text-[#495057]">{block.viewTitle}</p>}
          {graph}
        </div>
      )}
    </div>
  );
}
