import { useMemo } from 'react';
import { Typography } from 'antd';
import { Activity, AlertTriangle, CheckCircle, Database, Home, Info, WifiOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

const { Title } = Typography;

const systemStatus = [
  { id: 'IPRONV53', name: 'IPRONV53', status: 'alert', tags: ['ALS-1', 'E-A SIDE', 'IOS', 'CS-A SIDE', 'TS-A SIDE'], cpu: 1, memory: 20, disk: 88 },
  { id: 'tableau282', name: 'tableau282', status: 'normal', tags: ['ALS-1', 'IOS', 'IVR'], cpu: 0, memory: 3, disk: 19 },
  { id: 'TS_SWAT_0', name: 'TS_SWAT_0', status: 'normal', tags: [], cpu: 0, memory: 12, disk: 12 },
  { id: 'TS_SWAT_I', name: 'TS_SWAT_I', status: 'normal', tags: [], cpu: 0, memory: 19, disk: 10 },
];

const dbPartitions = [
  { system: 'SYSSUB', current: '4.9G', max: '4.9G', total: '4.87G', usage: 0 },
  { system: 'TS_SWAT_0', current: '111.8G', max: '111.8G', total: '59.47G', usage: 47 },
  { system: 'TS_SWAT_I', current: '37.4G', max: '37.4G', total: '17.71G', usage: 53 },
  { system: 'UNDO1', current: '3G', max: '3G', total: '3.03G', usage: 0 },
  { system: 'USR', current: '1G', max: '1G', total: '0.11G', usage: 89 },
];

const incidents = [
  {
    id: 1,
    time: '2025-09-22 08:52:49',
    system: 'IPRONV53',
    node: 'C1N1',
    eventId: '1510006',
    level: 'critical',
    process: 'IESLC_A',
    message: 'MediaDeliveryId[2024007055]Index(2) IP(100.100.107.71:15060)',
  },
  {
    id: 2,
    time: '2025-09-22 09:15:23',
    system: 'tableau282',
    node: 'C2N1',
    eventId: '1520011',
    level: 'major',
    process: 'IVR_PROC',
    message: 'Connection timeout to database server DB_MAIN (10.20.30.40:1521)',
  },
  {
    id: 3,
    time: '2025-09-22 10:03:17',
    system: 'TS_SWAT_0',
    node: 'C3N2',
    eventId: '1530008',
    level: 'minor',
    process: 'MON_SVC',
    message: 'Memory usage threshold exceeded: 85% (Max: 80%)',
  },
  {
    id: 4,
    time: '2025-09-22 10:45:52',
    system: 'TS_SWAT_I',
    node: 'C1N3',
    eventId: '1540002',
    level: 'major',
    process: 'SYNC_MGR',
    message: 'Data replication lag detected: 15 minutes behind primary node',
  },
];

const statusConfig = {
  alert: { color: 'bg-red-500', icon: AlertTriangle, text: 'ALERT' },
  normal: { color: 'bg-green-500', icon: CheckCircle, text: 'NORMAL' },
  warning: { color: 'bg-yellow-500', icon: Info, text: 'WARNING' },
  offline: { color: 'bg-gray-500', icon: WifiOff, text: 'OFFLINE' },
};

const tagColors: Record<string, string> = {
  'E-A SIDE': 'bg-red-500',
  IOS: 'bg-blue-500',
  'CS-A SIDE': 'bg-cyan-500',
  'TS-A SIDE': 'bg-purple-500',
  'IX-A SIDE': 'bg-orange-500',
  'ALS-1': 'bg-green-500',
  CORCUS: 'bg-indigo-500',
  IVR: 'bg-yellow-500',
};

const incidentLevelConfig = {
  critical: { color: 'bg-red-500', text: 'CRITICAL' },
  major: { color: 'bg-orange-500', text: 'MAJOR' },
  minor: { color: 'bg-yellow-500', text: 'MINOR' },
};

export default function Dashboard() {
  const incidentCounts = useMemo(() => {
    return {
      critical: incidents.filter((i) => i.level === 'critical').length,
      major: incidents.filter((i) => i.level === 'major').length,
      minor: incidents.filter((i) => i.level === 'minor').length,
    };
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <Title level={3} className="!mb-0 flex items-center gap-2">
          <Home className="h-5 w-5 text-blue-500" />
          대시보드
        </Title>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[384px_1fr] gap-4">
        <div>
          <Card className="gap-0 h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4" />
                시스템 현황
              </CardTitle>
            </CardHeader>
            <CardContent>
              {systemStatus.map((system, index) => {
                const StatusIcon = statusConfig[system.status as keyof typeof statusConfig].icon;
                return (
                  <div key={system.id}>
                    {index > 0 && <div className="border-t my-3" />}
                    <div className="relative">
                      <div className={cn('absolute top-0 left-0 w-1 h-full rounded-l', statusConfig[system.status as keyof typeof statusConfig].color)} />
                      <div className="pl-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h5 className="text-sm font-medium">{system.name}</h5>
                          <StatusIcon className={cn('h-4 w-4', system.status === 'alert' ? 'text-red-500' : 'text-green-500')} />
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {system.tags.length > 0 ? (
                            system.tags.map((tag) => (
                              <Badge key={tag} variant="secondary" className={cn('text-[10px] px-1.5 py-0 text-white', tagColors[tag] || 'bg-gray-500')}>
                                {tag}
                              </Badge>
                            ))
                          ) : (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              APS
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-2">
                          <div className="space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-muted-foreground">CPU</span>
                              <span className="text-xs font-medium">{system.cpu}%</span>
                            </div>
                            <Progress value={system.cpu} className="h-1.5" />
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-muted-foreground">메모리</span>
                              <span className="text-xs font-medium">{system.memory}%</span>
                            </div>
                            <Progress value={system.memory} className="h-1.5" />
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-muted-foreground">디스크</span>
                              <span className={cn('text-xs font-medium', system.disk > 80 ? 'text-red-500' : '')}>{system.disk}%</span>
                            </div>
                            <Progress value={system.disk} className={cn('h-1.5', system.disk > 80 ? '[&>div]:bg-red-500' : '')} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 min-w-0">
          <Card className="gap-0">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  데이터베이스 파티션 사용현황
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                {dbPartitions.map((partition) => (
                  <div key={partition.system} className="space-y-2 p-3 rounded-lg bg-muted/30">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-sm font-medium">{partition.system}</span>
                        <div className="flex gap-4 mt-1">
                          <span className="text-xs text-muted-foreground">최대: {partition.max}</span>
                          <span className="text-xs text-muted-foreground">현재: {partition.current}</span>
                          <span className="text-xs text-muted-foreground">전체: {partition.total}</span>
                        </div>
                      </div>
                      <span className={cn('text-sm font-bold', partition.usage > 80 ? 'text-red-500' : partition.usage > 50 ? 'text-yellow-500' : 'text-green-500')}>
                        {partition.usage}%
                      </span>
                    </div>
                    <Progress value={partition.usage} className={cn('h-2', partition.usage > 80 ? '[&>div]:bg-red-500' : partition.usage > 50 ? '[&>div]:bg-yellow-500' : '')} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="gap-0">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  장애 현황
                </CardTitle>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="destructive" className="text-xs">
                    CRITICAL ({incidentCounts.critical})
                  </Badge>
                  <Badge variant="secondary" className="text-xs bg-orange-500 text-white">
                    MAJOR ({incidentCounts.major})
                  </Badge>
                  <Badge variant="secondary" className="text-xs bg-yellow-500 text-white">
                    MINOR ({incidentCounts.minor})
                  </Badge>
                </div>
              </div>
              <CardDescription className="text-xs">
                최근 1주일간 장애발생: {incidents.length}건, 미처리: {incidents.length}건
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
              {incidents.length > 0 ? (
                incidents.map((incident) => {
                  const levelConfig = incidentLevelConfig[incident.level as keyof typeof incidentLevelConfig];
                  return (
                    <div key={incident.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 text-white', levelConfig.color)}>
                          {levelConfig.text}
                        </Badge>
                        <span className="text-xs font-medium">{incident.system}</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">{incident.time}</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex gap-4 text-xs flex-wrap">
                          <span className="text-muted-foreground">노드: {incident.node}</span>
                          <span className="text-muted-foreground">이벤트: {incident.eventId}</span>
                          <span className="text-muted-foreground">프로세스: {incident.process}</span>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{incident.message}</div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  현재 장애가 없습니다
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
