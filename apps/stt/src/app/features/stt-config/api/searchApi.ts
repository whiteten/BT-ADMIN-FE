import ApiClient, { type ApiResponse } from '@/shared-util';
import type {
  SttResultSentenceItem,
  SttResultSentenceParams,
  SttSearchCallbotDetailItem,
  SttSearchCallbotDetailParams,
  SttSearchCallbotItem,
  SttSearchCallbotParams,
  SttSearchItem,
  SttSearchListenParams,
  SttSearchListenParsed,
  SttSearchParams,
} from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

interface WaveJsonResponse {
  response?: string;
  interval?: number;
  result?: unknown;
}

function parseMultipartMixed(buffer: ArrayBuffer, contentType: string): SttSearchListenParsed {
  const boundaryMatch = /boundary=([^\s;]+)/i.exec(contentType);
  if (!boundaryMatch) return { waveData: null, waveInterval: 0, audioBlob: null };

  const boundary = boundaryMatch[1].replace(/^"(.*)"$/, '$1');
  const bytes = new Uint8Array(buffer);
  const delimiter = new TextEncoder().encode(`--${boundary}`);

  const positions: number[] = [];
  outer: for (let i = 0; i <= bytes.length - delimiter.length; i++) {
    for (let j = 0; j < delimiter.length; j++) {
      if (bytes[i + j] !== delimiter[j]) continue outer;
    }
    positions.push(i);
  }

  if (positions.length < 2) return { waveData: null, waveInterval: 0, audioBlob: null };

  const extractBody = (boundaryPos: number, nextPos: number): Uint8Array => {
    let start = boundaryPos + delimiter.length;
    if (bytes[start] === 13 && bytes[start + 1] === 10) start += 2;
    for (let i = start; i <= nextPos - 4; i++) {
      if (bytes[i] === 13 && bytes[i + 1] === 10 && bytes[i + 2] === 13 && bytes[i + 3] === 10) {
        let end = nextPos;
        if (end >= 2 && bytes[end - 2] === 13 && bytes[end - 1] === 10) end -= 2;
        return bytes.slice(i + 4, end);
      }
    }
    return new Uint8Array(0);
  };

  const part1 = extractBody(positions[0], positions[1]);
  const part2 = extractBody(positions[1], positions.length > 2 ? positions[2] : bytes.length);

  let waveData: number[] | null = null;
  let waveInterval = 0;
  try {
    const parsed = JSON.parse(new TextDecoder('utf-8').decode(part1)) as WaveJsonResponse;
    if (typeof parsed.response === 'string' && parsed.response.length > 0) {
      waveData = parsed.response.split(',').map(Number);
    }
    if (typeof parsed.interval === 'number') {
      waveInterval = parsed.interval;
    }
  } catch {
    // 파싱 실패 시 waveData null 유지
  }

  const audioBlob = part2.length > 0 ? new Blob([part2], { type: 'application/octet-stream' }) : null;
  return { waveData, waveInterval, audioBlob };
}

export const searchApi = {
  getSttSearch: async (params?: SttSearchParams) => {
    const response = await apiClient.get<ApiResponse<{ items: SttSearchItem[] }>>('/stt-search-list', { params });
    return response.data?.data?.items ?? [];
  },
  getSttSearchCallbot: async (params?: SttSearchCallbotParams) => {
    const response = await apiClient.get<ApiResponse<{ items: SttSearchCallbotItem[] }>>('/stt-search-callbot-list', { params });
    return response.data?.data?.items ?? [];
  },
  getSttSearchCallbotDetail: async (params?: SttSearchCallbotDetailParams) => {
    const response = await apiClient.get<ApiResponse<{ items: SttSearchCallbotDetailItem[] }>>('/stt-search-callbot-detail', { params });
    return response.data?.data?.items ?? [];
  },
  getSttResultSentence: async (params?: SttResultSentenceParams) => {
    const response = await apiClient.get<ApiResponse<{ items: SttResultSentenceItem[] }>>('/stt-search-result-sentence', { params });
    return response.data?.data?.items ?? [];
  },
  getSttSearchListen: async (params?: SttSearchListenParams): Promise<SttSearchListenParsed> => {
    const response = await apiClient.post<ArrayBuffer>('/stt-search-listen', params, { responseType: 'arraybuffer', silent: true });
    const buffer = response.data as ArrayBuffer;
    const contentType = (response.headers as Record<string, string>)['content-type'] ?? '';
    return parseMultipartMixed(buffer, contentType);
  },
  exportSttSearchExcel: async (data: { ucidGkeys: string[] }) => {
    return await apiClient.post<Blob>('/stt-search-excel', data, { responseType: 'blob' });
  },
};
