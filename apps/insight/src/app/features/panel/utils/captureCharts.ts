import dayjs from 'dayjs';
import { getRegisteredChart } from './chartCaptureRegistry';

/**
 * 차트 패널 PNG 캡처 — 최대 6개 차트를 화면 분할 레이아웃으로 한 장에 합성한다.
 *
 * 레거시(IPR50S8030)는 라디오로 그리드/차트를 토글해 화면 전체를 html2canvas 로 1장 캡처했으나,
 * 신규는 자유 배치 UI라 차트 개수를 감지해 자동 분할한다. ECharts 네이티브 getDataURL 로
 * 각 차트를 고해상도 PNG 로 뽑아 오프스크린 canvas 에 배치 → 더 선명(html2canvas 불필요).
 *
 * 행별 열 수 레이아웃(개수별):
 *  1=[1] 전체 · 2=[1,1] 상하 · 3=[1,2] 위1+아래2 · 4=[2,2] 4등분 · 5=[2,3] · 6=[3,3] 6등분
 */
const ROW_LAYOUTS: Record<number, number[]> = {
  1: [1],
  2: [1, 1],
  3: [1, 2],
  4: [2, 2],
  5: [2, 3],
  6: [3, 3],
};

const MAX_CHARTS = 6;
const CANVAS_W = 1600;
const PAD = 24;
const GAP = 16;
const ROW_H = 340;

export interface CaptureChartItem {
  panelId: number;
  title: string;
}

export interface CaptureResult {
  ok: boolean;
  /** 실제 캡처된 차트 수 */
  count: number;
  /** 6개 초과로 잘린 경우 true */
  truncated: boolean;
  reason?: string;
}

/** 차트 패널 목록을 PNG 한 장으로 합성·다운로드. */
export async function captureChartsToPng(items: CaptureChartItem[], reportTitle: string): Promise<CaptureResult> {
  const truncated = items.length > MAX_CHARTS;
  const target = items.slice(0, MAX_CHARTS);

  // 등록된 인스턴스에서 고해상도 PNG dataURL 추출 → 이미지 로드 (패널명과 함께 보관)
  const loaded: { img: HTMLImageElement; title: string }[] = [];
  for (const it of target) {
    const inst = getRegisteredChart(it.panelId);
    if (!inst) continue;
    try {
      const url = inst.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#ffffff' });
      loaded.push({ img: await loadImage(url), title: it.title });
    } catch {
      /* 개별 차트 추출 실패는 스킵 */
    }
  }

  if (loaded.length === 0) {
    return { ok: false, count: 0, truncated, reason: '캡처할 차트가 없습니다.' };
  }

  const rows = ROW_LAYOUTS[loaded.length] ?? [3, 3];
  const rowCount = rows.length;
  const height = PAD * 2 + rowCount * ROW_H + (rowCount - 1) * GAP;

  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_W;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { ok: false, count: 0, truncated, reason: '캔버스 생성 실패' };

  // 배경
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, CANVAS_W, height);

  // 셀 배치 (행별 열 수) — 각 셀 상단에 패널명 표시 (보고서명/시각 헤더 없음, 파일명에 보고서명 포함)
  let idx = 0;
  let y = PAD;
  for (const cols of rows) {
    const cellW = (CANVAS_W - PAD * 2 - GAP * (cols - 1)) / cols;
    for (let c = 0; c < cols && idx < loaded.length; c++) {
      const x = PAD + c * (cellW + GAP);
      const cell = loaded[idx++];
      drawCell(ctx, cell.img, cell.title, x, y, cellW, ROW_H);
    }
    y += ROW_H + GAP;
  }

  const blob = await canvasToBlob(canvas);
  if (!blob) return { ok: false, count: loaded.length, truncated, reason: '이미지 생성 실패' };

  const safe = (reportTitle || '통계차트').replace(/[\\/:*?"<>|]/g, '_').trim();
  downloadBlob(blob, `${safe}_차트_${dayjs().format('YYYYMMDDHHmmss')}.png`);

  return { ok: true, count: loaded.length, truncated };
}

// ── 내부 유틸 ───────────────────────────────────────────────

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** 셀 = 상단 패널명 스트립 + 차트(비율 유지 contain) + 옅은 테두리. */
const TITLE_H = 30;

function drawCell(ctx: CanvasRenderingContext2D, img: HTMLImageElement, title: string, x: number, y: number, w: number, h: number): void {
  // 셀 배경 + 테두리
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#e4e7ec';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

  // 패널명 스트립 (옅은 배경 + 하단 구분선)
  ctx.fillStyle = '#f9fafb';
  ctx.fillRect(x + 1, y + 1, w - 2, TITLE_H - 1);
  ctx.strokeStyle = '#e4e7ec';
  ctx.beginPath();
  ctx.moveTo(x + 1, y + TITLE_H + 0.5);
  ctx.lineTo(x + w - 1, y + TITLE_H + 0.5);
  ctx.stroke();
  ctx.fillStyle = '#101828';
  ctx.font = "bold 14px 'Malgun Gothic', sans-serif";
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(ellipsize(ctx, title || '(제목 없음)', w - 24), x + 12, y + TITLE_H / 2 + 1);

  // 차트 영역(스트립 아래) — 비율 유지 중앙 배치
  const ay = y + TITLE_H;
  const ah = h - TITLE_H;
  const ratio = Math.min(w / img.width, ah / img.height);
  const dw = img.width * ratio;
  const dh = img.height * ratio;
  ctx.drawImage(img, x + (w - dw) / 2, ay + (ah - dh) / 2, dw, dh);
}

/** 폭 초과 시 말줄임표. */
function ellipsize(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1);
  return s + '…';
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
