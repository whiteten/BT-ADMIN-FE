import { type ChangeEvent, useRef, useState } from 'react';
// 사용하지 않는 useNavigate 제거
import { useQueryClient } from '@tanstack/react-query';
//import { Button, Input, Select } from 'antd';
import dayjs from 'dayjs';
import { toast } from '@/shared-util';
//import NoData from '@/components/custom/NoData';

//import PageHeader from '@/components/custom/PageHeader';
//import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
//import { useModal } from '@/libs/shared-ui/src/hooks/useModal';
import { clientQueryKeys, useCreateTaskboardBg, useGetTaskboardBg } from '../../features/board/hooks/useTaskboardQueries';
import type { TaskboardBg } from '../../features/board/types/taskboard.types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { IconTrash } from '@/components/custom/Icons';

// 해상도 세팅
const RESOLUTIONS = {
  HD: { width: 1280, height: 720, label: 'HD (1280x720)' },
  FHD: { width: 1920, height: 1080, label: 'FHD (1920x1080)' },
  QHD: { width: 2560, height: 1440, label: 'QHD (2560x1440)' },
};

type ResolutionKey = keyof typeof RESOLUTIONS;

interface ImageData {
  id: number;
  url: string;
  previewUrl?: string;
  res: ResolutionKey;
  type: 'AUTO' | 'DIRECT';
}

const dataURLtoFile = (dataurl: string, filename: string) => {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] ?? 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
};

export default function TaskBg() {
  // 사용하지 않는 상태값 읽기 변수 제거, setter만 유지
  const [, setImages] = useState<ImageData[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRes, setSelectedRes] = useState<ResolutionKey>('FHD');
  const [, setUploadedFile] = useState<File | null>(null);
  const [originalImgUrl, setOriginalImgUrl] = useState<string>('');
  const [previewImages, setPreviewImages] = useState<ImageData[]>([]);
  const queryClient = useQueryClient();
  const { data: tasBoardList, isLoading } = useGetTaskboardBg();
  const { mutateAsync: createBgMutate } = useCreateTaskboardBg();

  // 로딩 상태
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);

  // Ref
  const directUploadInputRef = useRef<HTMLInputElement>(null);

  // 1. [완성이미지] 직접 업로드 핸들러
  const handleDirectUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      setImages((prev) => [{ id: Date.now(), url, previewUrl: url, res: 'FHD', type: 'DIRECT' }, ...prev]);
    };
    reader.readAsDataURL(file);
    if (directUploadInputRef.current) directUploadInputRef.current.value = '';
  };

  // 2. [png 자동생성] 모달 내 CI 파일 업로드
  const handleAutoFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setPreviewImages([]);
      setProgress(0);

      const reader = new FileReader();
      reader.onload = (event) => {
        setOriginalImgUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 3. 카드 삭제 핸들러
  //const handleDeleteCard = (id: number) => {
  //  if (window.confirm('저장된 배경 이미지를 삭제하시겠습니까?')) {
  //    setImages((prev) => prev.filter((img) => img.id !== id));
  //  }
  //};

  // 4. CI 색상 추출 (배경색 제외)
  const extractDominantColor = (img: HTMLImageElement): [number, number, number] => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return [15, 91, 158];

    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let maxSaturation = -1;
    let bestR = 15,
      bestG = 91,
      bestB = 158;

    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 128) continue;
      const r = data[i],
        g = data[i + 1],
        b = data[i + 2];

      // 채도(Colorfulness) 계산: 흑백, 회색 등 무채색을 완벽히 걸러냄
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const saturation = max === 0 ? 0 : (max - min) / max;
      const isGray = max - min < 20;

      if (!isGray && saturation > maxSaturation && max > 50 && max < 240) {
        maxSaturation = saturation;
        bestR = r;
        bestG = g;
        bestB = b;
      }
    }

    // 브랜드 컬러가 너무 어두우면 전광판용으로 밝게 부스팅
    if (bestR < 80 && bestG < 80 && bestB < 80) {
      return [Math.min(255, bestR + 60), Math.min(255, bestG + 60), Math.min(255, bestB + 100)];
    }
    return [bestR, bestG, bestB];
  };

  // 5. 비동기 백그라운드 20종 생성 (다양한 4가지 테마 적용)
  const handleAnalyze = () => {
    if (!originalImgUrl) {
      alert('CI 이미지를 먼저 업로드해주세요.');
      return;
    }

    setIsAnalyzing(true);
    setProgress(0);
    setPreviewImages([]);

    const img = new Image();
    img.onload = async () => {
      const [domR, domG, domB] = extractDominantColor(img);
      const targetRes = RESOLUTIONS[selectedRes];
      const newPreviews: ImageData[] = [];

      const w = targetRes.width;
      const h = targetRes.height;

      for (let i = 0; i < 20; i++) {
        await new Promise((resolve) => setTimeout(resolve, 30)); // 렌더링 UI 업데이트를 위한 딜레이

        const bgCanvas = document.createElement('canvas');
        bgCanvas.width = w;
        bgCanvas.height = h;
        const ctx = bgCanvas.getContext('2d');

        if (ctx) {
          const themeType = i % 4; // 4가지 대분류 테마
          const variant = Math.floor(i / 4); // 0~4까지 세부 변형 값 (이 값으로 행열 개수, 사이즈를 비틉니다)
          const pad = 20 + variant * 5; // 패딩도 조금씩 다르게

          // [공통] 전광판 카드(Panel) 그리기 헬퍼 함수
          const drawPanel = (x: number, y: number, panelW: number, panelH: number, bg: string, topBarColor: string | null = null) => {
            ctx.fillStyle = bg;
            ctx.fillRect(x, y, panelW, panelH);
            if (topBarColor) {
              ctx.fillStyle = topBarColor;
              ctx.fillRect(x, y, panelW, 15 + variant * 2);
            }
          };

          const brandColor = `rgb(${domR}, ${domG}, ${domB})`;
          const brandColorDark = `rgb(${Math.max(0, domR - 40)}, ${Math.max(0, domG - 40)}, ${Math.max(0, domB - 40)})`;

          if (themeType === 0) {
            // [테마 1] 다크 모드 종합 상황판 (변형: 배경색, 헤더높이, 사이드바 유무, 카드 개수)
            ctx.fillStyle = `rgb(${10 + variant * 3}, ${15 + variant * 3}, ${25 + variant * 3})`;
            ctx.fillRect(0, 0, w, h);

            const headerH = 80 + variant * 15;
            ctx.fillStyle = variant % 2 === 0 ? brandColor : '#1e293b'; // 헤더 색상 변형
            ctx.fillRect(0, 0, w, headerH);
            if (variant % 2 !== 0) {
              ctx.fillStyle = brandColor;
              ctx.fillRect(0, 0, w, 8);
            }

            const hasSidebar = variant % 2 === 0;
            const sideW = hasSidebar ? w * 0.2 + variant * 10 : 0;
            if (hasSidebar) drawPanel(pad, headerH + pad, sideW, h - headerH - pad * 2, '#1e293b');

            const cols = 2 + (variant % 3); // 열 2,3,4개
            const rows = 2 + (variant % 2); // 행 2,3개
            const rightW = w - sideW - pad * (hasSidebar ? 3 : 2);
            const cW = (rightW - pad * (cols - 1)) / cols;
            const cH = (h - headerH - pad * (rows + 1)) / rows;

            for (let r = 0; r < rows; r++) {
              for (let c = 0; c < cols; c++) {
                drawPanel((hasSidebar ? sideW + pad * 2 : pad) + c * (cW + pad), headerH + pad + r * (cH + pad), cW, cH, '#1e293b', variant % 3 === 0 ? brandColor : null);
              }
            }
          } else if (themeType === 1) {
            // [테마 2] 모던 화이트/그레이 대시보드 (변형: 상단메뉴 vs 좌측메뉴, 카드 6~12개)
            ctx.fillStyle = variant % 2 === 0 ? '#f1f5f9' : '#e2e8f0';
            ctx.fillRect(0, 0, w, h);

            const isTopNav = variant % 2 !== 0;
            const navSize = isTopNav ? 100 + variant * 5 : w * 0.15 + variant * 15;

            ctx.fillStyle = '#ffffff';
            if (isTopNav) ctx.fillRect(0, 0, w, navSize);
            else ctx.fillRect(0, 0, navSize, h);
            ctx.fillStyle = brandColor;
            if (isTopNav) ctx.fillRect(0, 0, w, navSize * 0.5);
            else ctx.fillRect(0, 0, navSize, 100);

            const cols = 3 + (variant % 2);
            const rows = 2 + (variant % 2);
            const mainX = isTopNav ? pad : navSize + pad;
            const mainY = isTopNav ? navSize + pad : pad;
            const cW = (w - mainX - pad * cols) / cols;
            const cH = (h - mainY - pad * rows) / rows;

            for (let r = 0; r < rows; r++) {
              for (let c = 0; c < cols; c++) {
                drawPanel(mainX + c * (cW + pad), mainY + r * (cH + pad), cW, cH, '#ffffff');
                ctx.fillStyle = '#f1f5f9'; // 가상 데이터 디테일
                ctx.fillRect(mainX + c * (cW + pad) + pad, mainY + r * (cH + pad) + cH * 0.4, cW - pad * 2, cH * 0.4);
              }
            }
          } else if (themeType === 2) {
            // [테마 3] 표(Grid) 집중 상황판 (변형: 헤더 색상, 행/열 개수, 테두리 굵기)
            ctx.fillStyle = variant % 3 === 0 ? '#f8fafc' : '#ffffff';
            ctx.fillRect(0, 0, w, h);

            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 4 + variant * 2;
            ctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2);

            const headerH = 100 + variant * 10;
            ctx.fillStyle = variant % 2 === 0 ? brandColor : '#334155';
            ctx.fillRect(pad, pad, w - pad * 2, headerH);
            if (variant % 2 !== 0) {
              ctx.fillStyle = brandColor;
              ctx.fillRect(pad, pad, w - pad * 2, 8);
            }

            const cols = 4 + (variant % 3); // 4~6열
            const rows = 3 + (variant % 3); // 3~5행
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 3 + (variant % 2);
            const colW = (w - pad * 2) / cols;
            const rowH = (h - pad * 2 - headerH) / rows;

            ctx.beginPath();
            for (let c = 1; c < cols; c++) {
              ctx.moveTo(pad + c * colW, pad + headerH);
              ctx.lineTo(pad + c * colW, h - pad);
            }
            for (let r = 1; r < rows; r++) {
              ctx.moveTo(pad, pad + headerH + r * rowH);
              ctx.lineTo(w - pad, pad + headerH + r * rowH);
            }
            ctx.stroke();
          } else {
            // [테마 4] 상하 분할 하이라이트 (변형: 상단 영역 비율, 카드 개수, 하단 분할)
            ctx.fillStyle = '#e2e8f0';
            ctx.fillRect(0, 0, w, h);

            const splitRatio = 0.35 + variant * 0.05; // 상단 배경 비율 조정
            const topGrad = ctx.createLinearGradient(0, 0, w, variant % 2 === 0 ? h : 0);
            topGrad.addColorStop(0, brandColorDark);
            topGrad.addColorStop(1, variant % 2 === 0 ? brandColor : '#1e293b');
            ctx.fillStyle = topGrad;
            ctx.fillRect(0, 0, w, h * splitRatio);

            const cols = 3 + (variant % 3); // 카드 3~5개
            const cW = (w - pad * (cols + 1)) / cols;
            const cH = h * (0.25 + variant * 0.03);
            const cardY = h * (splitRatio - 0.1);

            for (let c = 0; c < cols; c++) {
              drawPanel(pad + c * (cW + pad), cardY, cW, cH, '#ffffff', variant % 2 === 0 ? brandColor : '#334155');
            }

            const botY = cardY + cH + pad;
            const botH = h - botY - pad;
            if (variant % 2 === 0) {
              drawPanel(pad, botY, w - pad * 2, botH, '#ffffff');
            } else {
              drawPanel(pad, botY, w * 0.5 - pad * 1.5, botH, '#ffffff');
              drawPanel(w * 0.5 + pad * 0.5, botY, w * 0.5 - pad * 1.5, botH, '#ffffff');
            }
          }

          // 썸네일 생성 로직 (아래 코드는 유지)
          const thumbCanvas = document.createElement('canvas');
          thumbCanvas.width = 480;
          thumbCanvas.height = 270;
          const thumbCtx = thumbCanvas.getContext('2d');
          if (thumbCtx) {
            thumbCtx.drawImage(bgCanvas, 0, 0, 480, 270);
          }

          newPreviews.push({
            id: Date.now() + i,
            url: bgCanvas.toDataURL('image/jpeg', 0.9),
            previewUrl: thumbCanvas.toDataURL('image/jpeg', 0.7),
            res: selectedRes,
            type: 'AUTO',
          });
        }
        setProgress(Math.floor(((i + 1) / 20) * 100));
      }

      setPreviewImages(newPreviews);
      setIsAnalyzing(false);
    };
    img.src = originalImgUrl;
  };

  const closeAndResetModal = () => {
    setIsModalOpen(false);
    setUploadedFile(null);
    setOriginalImgUrl('');
    setPreviewImages([]);
    setProgress(0);
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen w-full font-sans">
      {/* 1. 상단 헤더 및 버튼 영역 */}
      <div className="flex justify-between items-center mb-8 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">전광판 배경 관리</h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => directUploadInputRef.current?.click()}
            className="px-4 py-2 bg-white border border-[#0f5b9e] text-[#0f5b9e] rounded-md text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm"
          >
            완성이미지 직접 업로드
          </button>
          <input type="file" ref={directUploadInputRef} onChange={handleDirectUpload} accept="image/png, image/jpeg" className="hidden" />

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-[#0f5b9e] text-white rounded-md text-sm font-semibold hover:bg-[#0c4a82] transition-colors shadow-sm"
          >
            png 자동생성 (AI)
          </button>
        </div>
      </div>

      {/* 2. 메인 화면 카드 리스트 (DB 연동 데이터 렌더링) */}
      {isLoading ? (
        <div className="py-24 flex justify-center items-center">
          <FallbackSpinner />
        </div>
      ) : !tasBoardList || tasBoardList.length === 0 ? (
        <div className="py-24 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-300 rounded-xl bg-white shadow-sm">
          <IconTrash className="w-12 h-12 mb-4 text-slate-300" /> {/* 적절한 빈 화면 아이콘으로 교체 */}
          <span className="text-lg font-medium">등록된 배경 이미지가 없습니다.</span>
          <span className="text-sm mt-2">상단의 버튼을 이용해 전광판 배경을 등록해보세요.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tasBoardList.map((item) => (
            <div
              key={item.pageId}
              className={`relative bg-white rounded-xl shadow-md border overflow-hidden transition-all ${item.useYn === 'N' ? 'border-slate-200 opacity-80' : 'border-[#0f5b9e]/20 hover:shadow-lg'}`}
            >
              {/* 이미지 영역 */}
              <div className="aspect-video bg-slate-100 relative overflow-hidden group">
                <img
                  src={item.fileName}
                  alt={item.pageName}
                  /* 사용여부 N이면 흑백(grayscale) 처리 및 약간 흐리게 */
                  className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${item.useYn === 'N' ? 'grayscale opacity-60' : ''}`}
                />

                {/* 생성 구분자 (AI / 직접생성) 뱃지 */}
                <div className="absolute top-2 left-2 px-2 py-1 bg-black bg-opacity-70 text-white text-[10px] rounded backdrop-blur-sm uppercase font-bold tracking-wider shadow-sm">
                  {item.genType === 'AI' ? 'AI 생성' : '직접 업로드'}
                </div>

                {/* 사용 안함(N) 일 때 이미지 위 오버레이 */}
                {item.useYn === 'N' && (
                  <div className="absolute inset-0 bg-slate-900/30 flex items-center justify-center">
                    <span className="px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded shadow-lg backdrop-blur-md">미사용 (비활성화)</span>
                  </div>
                )}
              </div>

              {/* 하단 텍스트 정보 영역 */}
              <div className="p-4 flex flex-col bg-white">
                <div className="flex justify-between items-start mb-3">
                  <div className="pr-2">
                    <h3 className={`text-[15px] font-bold truncate ${item.useYn === 'N' ? 'text-slate-500 line-through' : 'text-slate-800'}`}>{item.pageName}</h3>
                    <p className="text-[11px] font-mono text-slate-400 mt-0.5">ID: {item.pageId}</p>
                  </div>

                  {/* 상태 뱃지 (Y/N) */}
                  <span
                    className={`flex-shrink-0 text-[10px] px-2 py-1 rounded font-bold border ${
                      item.useYn === 'Y' ? 'bg-blue-50 text-[#0f5b9e] border-blue-200' : 'bg-slate-50 text-slate-500 border-slate-200'
                    }`}
                  >
                    {item.useYn === 'Y' ? '사용중' : '미사용'}
                  </span>
                </div>

                {/* 메타 데이터 (만든이, 날짜) */}
                <div className="flex justify-between items-center text-xs text-slate-500 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px]">👤</span>
                    <span className="font-medium">{item.authorName ?? '시스템'}</span>
                  </div>
                  <span className="font-medium tracking-tight">{dayjs(item.regDt).format('YYYY.MM.DD HH:mm')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. 자동생성 모달 팝업 영역 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-[900px] max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* 모달 헤더 */}
            <div className="px-6 py-4 border-b flex justify-between items-center bg-white">
              <h2 className="text-xl font-bold text-slate-800">CI 기반 배경 자동생성</h2>
              <button onClick={closeAndResetModal} className="text-slate-400 hover:text-slate-600 text-2xl font-bold transition-colors">
                ×
              </button>
            </div>

            {/* 모달 컨텐츠 */}
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
              {/* 업로드 컨트롤 및 원본 이미지 영역 */}
              <div className="flex flex-col md:flex-row gap-6 mb-8 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex-1 flex flex-col justify-center gap-4">
                  {/* 해상도 선택기 (모달 내부로 이동) */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">출력 해상도 설정</label>
                    <select
                      value={selectedRes}
                      onChange={(e) => setSelectedRes(e.target.value as ResolutionKey)}
                      className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#0f5b9e] bg-white font-medium text-slate-700"
                    >
                      {Object.entries(RESOLUTIONS).map(([key, { label }]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">CI 로고 이미지 업로드</label>
                    <input
                      type="file"
                      onChange={handleAutoFileChange}
                      accept="image/png, image/jpeg"
                      className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-[#0f5b9e] hover:file:bg-blue-100 cursor-pointer border border-slate-200 rounded-md"
                    />
                  </div>

                  <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || !originalImgUrl}
                    className={`py-3 mt-2 w-full rounded-md text-sm font-bold shadow-sm transition-all ${isAnalyzing || !originalImgUrl ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-[#0f5b9e] text-white hover:bg-[#0c4a82]'}`}
                  >
                    {isAnalyzing ? '데이터 분석 및 렌더링 중...' : '디자인 분석 및 20종 생성'}
                  </button>
                </div>

                {/* 원본 CI 미리보기 */}
                <div className="w-full md:w-64 aspect-video bg-slate-100 rounded-lg border border-slate-200 flex flex-col items-center justify-center p-2 relative">
                  {originalImgUrl ? (
                    <>
                      <span className="absolute top-2 left-2 text-[10px] bg-slate-800 text-white px-2 py-1 rounded font-bold z-10">원본 CI</span>
                      <img src={originalImgUrl} alt="Original CI" className="max-w-full max-h-full object-contain drop-shadow-md" />
                    </>
                  ) : (
                    <span className="text-sm text-slate-400 font-medium">로고 영역</span>
                  )}
                </div>
              </div>

              {/* 분석 로딩바 */}
              {isAnalyzing && (
                <div className="mb-8">
                  <div className="flex justify-between text-sm font-bold text-[#0f5b9e] mb-2">
                    <span>최적화된 대시보드 패턴 렌더링 중...</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                    <div className="bg-[#0f5b9e] h-2.5 rounded-full transition-all duration-200 ease-out" style={{ width: `${progress}%` }}></div>
                  </div>
                </div>
              )}

              {/* 생성된 추천 프리뷰 영역 */}
              {previewImages.length > 0 && !isAnalyzing && (
                <div>
                  <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center">
                    <span className="w-2 h-2 rounded-full bg-[#0f5b9e] mr-2"></span>추천 배경 패턴 (20종)
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {previewImages.map((preview) => (
                      <div
                        key={preview.id}
                        className="aspect-video bg-slate-100 relative group rounded-lg overflow-hidden border-2 border-transparent hover:border-[#0f5b9e] shadow-sm hover:shadow-md cursor-pointer"
                      >
                        <img src={preview.previewUrl} alt="Preview" className="w-full h-full object-cover" />

                        {/* CSS 커튼 버그 해결: 확실하게 opacity-0 으로 투명하게 숨기고 hover 시에만 보이게 변경 */}
                        <div className="absolute inset-0 bg-[rgba(0,0,0,0.5)] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            onClick={async () => {
                              try {
                                const imageFile = dataURLtoFile(preview.url, `bg_${Date.now()}.jpg`);

                                const requestData: TaskboardBg = {
                                  tenantId: 'TENANT_001',
                                  pageId: `PAGE_${Date.now()}`,
                                  pageName: `자동생성 테마 ${Date.now().toString().slice(-4)}`,
                                  authorName: 'admin',
                                  authRole: 'MASTER',
                                  genType: 'AI',
                                  useYn: 'Y',
                                  regDt: new Date().toISOString(), // 날짜 추가
                                  fileName: '',
                                };

                                const formData = new FormData();
                                formData.append('image', imageFile);
                                formData.append('data', new Blob([JSON.stringify(requestData)], { type: 'application/json' }));

                                // fetch 대신 깔끔하게 React Query 훅 사용!
                                await createBgMutate(formData);

                                toast.success('서버에 정상적으로 저장되었습니다!');
                                await queryClient.invalidateQueries({ queryKey: clientQueryKeys.getClients().queryKey });
                                setIsModalOpen(false);
                              } catch (error) {
                                console.error('API 에러:', error);
                                toast.error('오류가 발생했습니다.');
                              }
                            }}
                            className="transform translate-y-2 group-hover:translate-y-0 px-4 py-2 bg-white text-[#0f5b9e] text-xs font-bold rounded-md shadow-lg transition-all duration-200"
                          >
                            서버에 저장하기
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
