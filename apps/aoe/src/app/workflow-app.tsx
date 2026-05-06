import * as React from 'react';
import WorkflowEditorPage from './pages/workflow/WorkflowEditorPage';
import '../styles.css';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

export default function WorkflowApp() {
  return (
    <React.Suspense fallback={<FallbackSpinner useFullScreen />}>
      <WorkflowEditorPage />
    </React.Suspense>
  );
}
