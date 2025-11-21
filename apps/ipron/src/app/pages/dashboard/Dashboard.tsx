import { useMemo } from 'react';
import { Typography } from 'antd';
import { Clock, Headphones, Home, Phone, TrendingUp, UserCheck, Users } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Label, LabelList, Pie, PieChart, PolarAngleAxis, PolarGrid, Radar, RadarChart, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

const metrics = [
  { id: 1, title: '서비스 레벨', subtitle: '20초 이내 응답률', icon: TrendingUp, status: 'On Track', progress: 85, target: 90, current: 85, unit: '%' },
  { id: 2, title: '처리율', subtitle: '오늘 목표 통화 처리율', icon: Phone, status: 'Behind', progress: 78, target: 95, current: 78, unit: '%' },
  { id: 3, title: '고객 만족도', subtitle: '평균 고객 만족도 점수', icon: UserCheck, status: 'Ahead', progress: 92, target: 85, current: 92, unit: '점' },
];

const agentStatuses = [
  { id: 1, agent: '김민수', duration: 245, status: '통화중', lastChanged: '2024-12-28 14:26' },
  { id: 2, agent: '박지은', duration: 0, status: '대기중', lastChanged: '2024-12-28 14:30' },
  { id: 3, agent: '이준호', duration: 420, status: '통화중', lastChanged: '2024-12-28 14:23' },
  { id: 4, agent: '최서연', duration: 0, status: '대기중', lastChanged: '2024-12-28 14:28' },
  { id: 5, agent: '정다은', duration: 0, status: '휴식', lastChanged: '2024-12-28 14:25' },
  { id: 6, agent: '강태현', duration: 198, status: '통화중', lastChanged: '2024-12-28 14:27' },
  { id: 7, agent: '윤채원', duration: 267, status: '통화중', lastChanged: '2024-12-28 14:26' },
  { id: 8, agent: '임도현', duration: 0, status: '대기중', lastChanged: '2024-12-28 14:29' },
  { id: 9, agent: '장서아', duration: 389, status: '통화중', lastChanged: '2024-12-28 14:24' },
  { id: 10, agent: '송하린', duration: 0, status: '대기중', lastChanged: '2024-12-28 14:31' },
  { id: 11, agent: '한지민', duration: 0, status: '오프라인', lastChanged: '2024-12-28 13:45' },
  { id: 12, agent: '조은비', duration: 298, status: '통화중', lastChanged: '2024-12-28 14:25' },
  { id: 13, agent: '김하늘', duration: 0, status: '휴식', lastChanged: '2024-12-28 14:20' },
  { id: 14, agent: '이도윤', duration: 0, status: '대기중', lastChanged: '2024-12-28 14:32' },
];

const statusColors = {
  'On Track': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  Behind: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  Ahead: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
};

const initialChartData = [
  { month: '1월', inbound: 2860, outbound: 1200 },
  { month: '2월', inbound: 3050, outbound: 1800 },
  { month: '3월', inbound: 2370, outbound: 1420 },
  { month: '4월', inbound: 2730, outbound: 1590 },
  { month: '5월', inbound: 2890, outbound: 1630 },
  { month: '6월', inbound: 3140, outbound: 1740 },
];
const chartConfig = {
  inbound: {
    label: '인바운드',
    color: '#3b82f6',
  },
  outbound: {
    label: '아웃바운드',
    color: 'var(--chart-2)',
  },
} satisfies ChartConfig;

const chartData2 = [
  { type: '일반문의', calls: 875, fill: 'var(--color-inquiry)' },
  { type: '기술지원', calls: 620, fill: 'var(--color-support)' },
  { type: '주문문의', calls: 487, fill: 'var(--color-order)' },
  { type: '불만접수', calls: 273, fill: 'var(--color-complaint)' },
  { type: '기타', calls: 190, fill: 'var(--color-other)' },
];
const chartConfig2 = {
  calls: {
    label: '통화량',
  },
  inquiry: {
    label: '일반문의',
    color: 'var(--chart-1)',
  },
  support: {
    label: '기술지원',
    color: 'var(--chart-2)',
  },
  order: {
    label: '주문문의',
    color: 'var(--chart-3)',
  },
  complaint: {
    label: '불만접수',
    color: 'var(--chart-4)',
  },
  other: {
    label: '기타',
    color: 'var(--chart-5)',
  },
} satisfies ChartConfig;

const chartData3 = [
  { time: '09-10시', today: 245, yesterday: 198 },
  { time: '10-11시', today: 312, yesterday: 256 },
  { time: '11-12시', today: 287, yesterday: 234 },
  { time: '14-15시', today: 298, yesterday: 241 },
  { time: '15-16시', today: 276, yesterday: 219 },
  { time: '16-17시', today: 264, yesterday: 208 },
];
const chartConfig3 = {
  today: {
    label: '오늘',
    color: 'var(--chart-1)',
  },
  yesterday: {
    label: '어제',
    color: 'var(--chart-2)',
  },
} satisfies ChartConfig;

const { Title } = Typography;

export default function Dashboard() {
  const chartData = initialChartData;

  const totalCalls = useMemo(() => {
    return chartData2.reduce((acc, curr) => acc + curr.calls, 0);
  }, []);
  return (
    <div className="grid gap-4 grid-cols-12">
      <div className="col-span-full">
        <Title level={3} className="!mb-0 flex items-center gap-2">
          <Home className="h-5 w-5 text-blue-500" />
          대시보드
        </Title>
      </div>
      <Card className="col-span-full md:col-span-6 lg:col-span-3 h-[130px] gap-0">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">총 통화량</CardTitle>
          <Phone className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">8,543</div>
          <p className="text-xs text-muted-foreground">전일 대비 +12.3%</p>
        </CardContent>
      </Card>
      <Card className="col-span-full md:col-span-6 lg:col-span-3 h-[130px] gap-0">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">활성 상담원</CardTitle>
          <Headphones className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">142</div>
          <p className="text-xs text-muted-foreground">총 168명 중</p>
        </CardContent>
      </Card>
      <Card className="col-span-full md:col-span-6 lg:col-span-3 h-[130px] gap-0">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">평균 통화시간</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">4:32</div>
          <p className="text-xs text-muted-foreground">목표 시간 5:00</p>
        </CardContent>
      </Card>
      <Card className="col-span-full md:col-span-6 lg:col-span-3 h-[130px] gap-0">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">대기 고객</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">23</div>
          <p className="text-xs text-muted-foreground">평균 대기시간 0:45</p>
        </CardContent>
      </Card>
      {metrics.map((metric) => (
        <Card key={metric.id} className="col-span-full lg:col-span-4 gap-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
            <metric.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">{metric.subtitle}</p>
            <div className="mt-2 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className={`px-2 py-1 rounded-full ${statusColors[metric.status as keyof typeof statusColors]}`}>{metric.status}</span>
                <span className="text-muted-foreground">
                  {metric.current} / {metric.target} {metric.unit}
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-1.5">
                <div className="bg-primary h-1.5 rounded-full" style={{ width: `${Math.min(metric.progress, 100)}%` }} />
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium">
                  {metric.target}
                  {metric.unit}
                </span>
                <span className="text-muted-foreground">{metric.progress}% 달성</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      <Card className="col-span-full xl:col-span-9 gap-0">
        <CardHeader>
          <CardTitle>월별 통화량 분석</CardTitle>
          <CardDescription>2024년 1월 - 6월</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] w-full">
          <ChartContainer config={chartConfig} className="h-full w-full">
            <BarChart
              accessibilityLayer
              data={chartData}
              layout="vertical"
              margin={{
                top: 5,
                right: 40,
                bottom: 5,
              }}
            >
              <CartesianGrid horizontal={false} />
              <YAxis dataKey="month" type="category" tickLine={false} tickMargin={10} axisLine={false} tickFormatter={(value) => value.slice(0, 3)} hide />
              <XAxis dataKey="inbound" type="number" hide />
              <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
              <Bar dataKey="inbound" layout="vertical" fill="var(--color-inbound)" radius={4}>
                <LabelList dataKey="month" position="insideLeft" offset={8} className="fill-white" fontSize={12} />
                <LabelList dataKey="inbound" position="insideRight" offset={8} className="fill-white font-semibold" fontSize={12} />
              </Bar>
              <Bar dataKey="outbound" layout="vertical" fill="var(--color-outbound)" radius={4}>
                <LabelList dataKey="month" position="insideLeft" offset={8} className="fill-white" fontSize={12} />
                <LabelList dataKey="outbound" position="insideRight" offset={8} className="fill-white font-semibold" fontSize={12} />
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
      <Card className="col-span-full xl:col-span-4">
        <CardHeader className="items-center pb-0">
          <CardTitle>상담 유형별 분포</CardTitle>
          <CardDescription>오늘 상담 통계</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-0">
          <ChartContainer config={chartConfig2} className="mx-auto aspect-square max-h-[250px]">
            <PieChart>
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
              <Pie data={chartData2} dataKey="calls" nameKey="type" innerRadius={60} strokeWidth={5}>
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                      return (
                        <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                          <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-3xl font-bold">
                            {totalCalls.toLocaleString()}
                          </tspan>
                          <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 24} className="fill-muted-foreground">
                            총 통화
                          </tspan>
                        </text>
                      );
                    }
                  }}
                />
              </Pie>
            </PieChart>
          </ChartContainer>
        </CardContent>
        <CardFooter className="flex-col gap-2 text-sm">
          <div className="flex items-center gap-2 leading-none font-medium">
            전월 대비 8.5% 상승 <TrendingUp className="h-4 w-4" />
          </div>
          <div className="text-muted-foreground leading-none">오늘 상담 유형별 통계</div>
        </CardFooter>
      </Card>
      <Card className="col-span-full xl:col-span-5">
        <CardHeader className="items-center pb-4">
          <CardTitle>시간대별 통화량 비교</CardTitle>
          <CardDescription>오늘 vs 어제 통화량 비교</CardDescription>
        </CardHeader>
        <CardContent className="pb-0">
          <ChartContainer config={chartConfig3} className="mx-auto aspect-square max-h-[250px]">
            <RadarChart
              data={chartData3}
              margin={{
                top: 10,
                right: 10,
                bottom: 10,
                left: 10,
              }}
            >
              <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
              <PolarAngleAxis
                dataKey="time"
                tick={({ x, y, textAnchor, index, ...props }) => {
                  const data = chartData3[index];
                  return (
                    <text x={x} y={index === 0 ? y - 10 : y} textAnchor={textAnchor} fontSize={13} fontWeight={500} {...props}>
                      <tspan>{data.today}</tspan>
                      <tspan className="fill-muted-foreground">/</tspan>
                      <tspan>{data.yesterday}</tspan>
                      <tspan x={x} dy={'1rem'} fontSize={12} className="fill-muted-foreground">
                        {data.time}
                      </tspan>
                    </text>
                  );
                }}
              />
              <PolarGrid />
              <Radar dataKey="today" stroke="var(--color-today)" fill="var(--color-today)" fillOpacity={0.3} strokeWidth={2} />
              <Radar dataKey="yesterday" stroke="var(--color-yesterday)" fill="var(--color-yesterday)" fillOpacity={0.3} strokeWidth={2} />
            </RadarChart>
          </ChartContainer>
        </CardContent>
        <CardFooter className="flex-col gap-2 text-sm">
          <div className="flex items-center gap-2 leading-none font-medium">
            전일 대비 통화량 22.5% 상승 <TrendingUp className="h-4 w-4" />
          </div>
          <div className="text-muted-foreground flex items-center gap-2 leading-none">오늘 피크 시간대 분석</div>
        </CardFooter>
      </Card>
      <Card className="col-span-full xl:col-span-3 xl:row-start-4 xl:row-end-6">
        <CardHeader>
          <CardTitle className="text-lg font-medium">상담사 현황</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {agentStatuses.map((agent) => (
              <div key={agent.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{agent.agent}</p>
                  <p className="text-xs text-muted-foreground">{agent.lastChanged}</p>
                </div>
                <div className="flex items-center">
                  {agent.status === '통화중' && (
                    <span className="inline-flex items-center justify-center w-16 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                      통화중
                    </span>
                  )}
                  {agent.status === '대기중' && (
                    <span className="inline-flex items-center justify-center w-16 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      대기중
                    </span>
                  )}
                  {agent.status === '휴식' && (
                    <span className="inline-flex items-center justify-center w-16 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                      휴식
                    </span>
                  )}
                  {agent.status === '오프라인' && (
                    <span className="inline-flex items-center justify-center w-16 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
                      오프라인
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <Button className="w-full mt-4" variant="outline">
            전체 상담사 보기
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
