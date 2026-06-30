/**
 * 트래킹 조회이력 + 엑셀 내보내기 API.
 *
 * BFF Flow:
 *  - ipron-tracking-audit-list
 *  - ipron-tracking-audit-detail
 *  - ipron-tracking-export (binary xlsx)
 */
import ApiClient, { type ApiResponse } from '@/shared-util';
import type { TrackingAudit, TrackingAuditSearchParams } from '../types/trackingAudit.types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export interface AuditPage {
  items: TrackingAudit[];
  page: number;
  size: number;
  total: number;
}

export interface ExportRequest {
  criteria: Record<string, unknown>;
  reason: string;
}

export const trackingAuditApi = {
  list: async (params: TrackingAuditSearchParams): Promise<AuditPage> => {
    const r = await apiClient.get<ApiResponse<AuditPage>>('/ipron-tracking-audit-list', {
      params: { ...params },
    });
    const d = r.data?.data;
    return d ?? { items: [], page: 0, size: 0, total: 0 };
  },

  detail: async (auditId: number): Promise<TrackingAudit | null> => {
    const r = await apiClient.get<ApiResponse<TrackingAudit>>('/ipron-tracking-audit-detail', {
      params: { auditId },
    });
    return r.data?.data ?? null;
  },

  /** 엑셀 다운로드 — Blob 반환. 호출 측에서 파일 저장 처리. */
  exportXlsx: async (req: ExportRequest): Promise<{ blob: Blob; filename: string }> => {
    const r = await apiClient.post<Blob>('/ipron-tracking-export', req, {
      responseType: 'blob',
    });
    // Content-Disposition 헤더에서 파일명 추출 (서버에서 RFC 5987 형식 제공)
    const cd = (r.headers?.['content-disposition'] ?? r.headers?.['Content-Disposition']) as string | undefined;
    let filename = `tracking-${Date.now()}.xlsx`;
    if (cd) {
      const m = /filename\*=UTF-8''([^;]+)/i.exec(cd);
      if (m) filename = decodeURIComponent(m[1]);
      else {
        const m2 = /filename="?([^";]+)"?/i.exec(cd);
        if (m2) filename = m2[1];
      }
    }
    return { blob: r.data, filename };
  },
};

/** Blob → 자동 다운로드 (브라우저 navigator). */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
