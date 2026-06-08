/**
 * 패킷 전문 실시간 조회 API.
 *
 * BE: POST /api/ipron/tracking/packet-log
 * BFF Flow: ipron-tracking-packet-log (body=request)
 *
 * FE 가 SEND/RECV 각 1회 호출 → 요청전문 + 응답전문 양쪽을 받음.
 */
import ApiClient, { type ApiResponse } from '@/shared-util';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export interface PacketLogRequest {
  systemId: number;
  serviceId: number;
  serviceVer: string;
  packetId: string;
  trKey: string;
  date: string; // YYYYMMDD
  sendRecv: 'SEND' | 'RECV';
  dataType: number; // 3 / 23 / 33
}

export interface PacketField {
  ck: string | null; // "TRUE"=반복부, "FALSE"=단일, null=raw text
  itemName: string | null;
  itemValue: string | null;
  itemDesc: string | null;
}

export interface PacketLogResponse {
  dataType: number;
  sendRecv: string;
  fields: PacketField[]; // dataType=3 일 때 사용
  json: string | null; // dataType=23/33 일 때 사용
  rawText: string | null; // 디버그용
}

export const packetLogApi = {
  trace: async (req: PacketLogRequest): Promise<PacketLogResponse> => {
    const response = await apiClient.post<ApiResponse<PacketLogResponse>>('/ipron-tracking-packet-log', req);
    const data = response.data?.data;
    if (!data) throw new Error('PACKET_LOG_EMPTY');
    return data;
  },
};
