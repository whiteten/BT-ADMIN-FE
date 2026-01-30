import type { ICellRendererParams } from 'ag-grid-community';
import { MessageCircle } from 'lucide-react';
import type { IntentListItem } from '../types';
import { ScrollArea } from '@/components/ui/scroll-area';

// TODO: API 연결 후 제거
const MOCK_SENTENCES = [
  '안녕하세요, 상담원 연결해 주세요.안녕하세요, 상담원 연결해 주세요.안녕하세요, 상담원 연결해 주세요.안녕하세요, 상담원 연결해 주세요.안녕하세요, 상담원 연결해 주세요.',
  '비밀번호를 변경하고 싶어요.',
  '결제 내역을 확인하려면 어떻게 해야 하나요?',
  '서비스 해지 절차가 어떻게 되나요?',
  '이벤트 혜택을 받을 수 있나요?',
  '배송 현황을 알고 싶습니다.',
  '환불 요청은 어디서 하나요?',
  '로그인이 안 돼요, 도와주세요.',
  '요금제를 변경하고 싶습니다.',
  '포인트 적립은 어떻게 하나요?',
  '회원 탈퇴를 하려면 어떻게 해야 하나요?',
  '상품 교환을 원합니다.',
  '영수증 발급이 가능한가요?',
  '예약 취소를 하고 싶어요.',
  '할인 쿠폰은 어디서 받을 수 있나요?',
  '이용 약관을 확인하고 싶습니다.',
  '제품 보증 기간이 얼마나 되나요?',
  '계좌 이체로 결제할 수 있나요?',
  '주문한 상품이 아직 안 왔어요.',
  '앱이 자꾸 오류가 나요.',
  '개인정보 수정은 어디서 하나요?',
  '매장 위치를 알려주세요.',
  '영업 시간이 어떻게 되나요?',
  '멤버십 등급 기준이 궁금해요.',
  '카드 등록은 어떻게 하나요?',
  '선물하기 기능이 있나요?',
  '해외 배송도 가능한가요?',
  '알림 설정을 변경하고 싶어요.',
  '이전 주문 내역을 보고 싶습니다.',
  '고객센터 운영 시간을 알려주세요.',
  '무료 체험 기간은 얼마인가요?',
  '자동 결제를 해지하고 싶어요.',
  '다른 기기에서도 로그인할 수 있나요?',
  '데이터 백업은 어떻게 하나요?',
  '친구 초대 이벤트가 있나요?',
  '세금계산서 발행이 가능한가요?',
  '구독 플랜을 업그레이드하고 싶어요.',
  '비회원으로도 주문할 수 있나요?',
  '적립금 사용 조건이 뭔가요?',
  '결제 수단을 변경하려면요?',
  '배송비는 얼마인가요?',
  '교환 기간이 지났는데 가능할까요?',
  '사이즈 교환을 하고 싶습니다.',
  '색상 옵션이 더 있나요?',
  '재입고 알림을 받을 수 있나요?',
  '위시리스트에 추가하는 방법을 알려주세요.',
  '후기를 작성하면 혜택이 있나요?',
  '1:1 문의는 어디서 하나요?',
  '채팅 상담이 가능한가요?',
  '전화 상담 번호를 알려주세요.',
  '불량 제품을 받았어요.',
  '오배송이 된 것 같아요.',
  '누락된 상품이 있어요.',
  '포장이 훼손되어 왔습니다.',
  '선물 포장 옵션이 있나요?',
  '메시지 카드도 넣을 수 있나요?',
  '당일 배송이 되나요?',
  '새벽 배송 지역을 확인하고 싶어요.',
  '해외 직구 상품의 관세는 어떻게 되나요?',
  '통관 절차가 어떻게 진행되나요?',
  '반품 택배를 어떻게 보내나요?',
  '환불은 언제 처리되나요?',
  '카드 취소 후 환불까지 얼마나 걸리나요?',
  '현금영수증 발급을 요청합니다.',
  '법인카드로 결제 가능한가요?',
  '할부 결제가 되나요?',
  '무이자 할부 카드가 어떤 게 있나요?',
  '간편결제로 할 수 있나요?',
  '페이 등록은 어떻게 하나요?',
  '결제 오류가 발생했어요.',
  '이중 결제가 된 것 같아요.',
  '주문 취소를 하고 싶어요.',
  '주문 내역을 수정할 수 있나요?',
  '배송지를 변경하고 싶습니다.',
  '수령인 정보를 바꿀 수 있나요?',
  '묶음 배송이 가능한가요?',
  '분할 배송으로 받고 싶어요.',
  '택배사를 선택할 수 있나요?',
  '안심 번호로 배송 받을 수 있나요?',
  '부재 시 경비실에 맡겨주세요.',
  '문 앞에 놓아주세요.',
  '배송 기사님께 전달할 메모를 남기고 싶어요.',
  '상품 상세 정보를 알고 싶어요.',
  '원산지가 어디인가요?',
  '유통기한이 어떻게 되나요?',
  '알레르기 성분이 포함되어 있나요?',
  '성분표를 확인할 수 있나요?',
  '사용 방법을 알려주세요.',
  '세탁 방법이 어떻게 되나요?',
  '조립 설명서가 있나요?',
  'AS 접수는 어디서 하나요?',
  '수리 비용이 얼마나 드나요?',
  '출장 수리가 가능한가요?',
  '대체 상품을 받을 수 있나요?',
  '품절된 상품은 언제 다시 들어오나요?',
  '한정판 상품인가요?',
  '단체 주문 할인이 있나요?',
  '대량 구매 문의를 하고 싶습니다.',
  '제휴 할인을 받으려면 어떻게 하나요?',
  '프로모션 코드를 입력하는 곳이 어디인가요?',
];

export default function IntentSentenceCustomDetail(_params: ICellRendererParams<IntentListItem>) {
  const sentences = MOCK_SENTENCES;

  return (
    <div className="flex flex-col h-full p-4 pl-7 gap-2 overflow-hidden bg-[var(--color-bt-primary)/10]">
      <div className="flex items-center gap-1.5 text-sm font-medium text-[var(--color-bt-primary)]">
        <span>의도 문장</span>
        <span className="text-xs font-normal text-muted-foreground">({sentences.length})</span>
      </div>
      <ScrollArea className="flex-1 h-0">
        <div className="grid grid-cols-2 gap-3 px-3">
          {sentences.map((sentence, index) => (
            <div
              key={index}
              className="flex items-start gap-2 rounded-lg border border-border/60 bg-card p-2.5 shadow-sm transition-all cursor-default border-l-3 border-l-[var(--color-bt-primary)]/60 hover:shadow-md hover:border-[var(--color-bt-primary)]/40"
            >
              <MessageCircle className="size-4 shrink-0 mt-0.5 text-[var(--color-bt-primary)]/60" />
              <span className="text-sm whitespace-pre-wrap break-all">{sentence}</span>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
