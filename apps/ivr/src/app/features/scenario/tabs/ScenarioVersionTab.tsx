import { useState } from 'react';
import { useParams } from 'react-router-dom';
import ScenarioDeploySidebar from '../components/ScenarioDeploySidebar';
import ScenarioVersionGrid from '../components/ScenarioVersionGrid';
import { useGetScenarioDetail } from '../hooks/useScenarioQueries';
import type { ScenarioVersion } from '../types';

export default function ScenarioVersionTab() {
  const { serviceId } = useParams();
  const numericId = Number(serviceId);

  const { data: scenario } = useGetScenarioDetail({
    params: { serviceId: numericId },
    queryOptions: { enabled: !!serviceId },
  });

  const [selectedVersion, setSelectedVersion] = useState<ScenarioVersion | null>(null);
  const [deploySidebarOpen, setDeploySidebarOpen] = useState(false);

  if (!scenario) return null;

  return (
    <div className="flex flex-1 min-h-0 -m-7">
      <div className="bg-white flex flex-col flex-1 min-h-0 overflow-hidden">
        <ScenarioVersionGrid
          key={scenario.serviceId}
          serviceId={scenario.serviceId}
          serviceName={scenario.serviceName}
          onSelectionChange={setSelectedVersion}
          onOpenDeploySidebar={() => setDeploySidebarOpen(true)}
        />
      </div>

      <ScenarioDeploySidebar open={deploySidebarOpen} serviceId={scenario.serviceId} selectedVersion={selectedVersion} onClose={() => setDeploySidebarOpen(false)} />
    </div>
  );
}
