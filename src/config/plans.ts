import type { UserTier } from '../types';

export interface ProductPlan {
  tier?: UserTier;
  name: string;
  price: string;
  total: string;
  summary: string;
  benefits: string[];
  pending?: boolean;
  recommended?: boolean;
}

export const PRODUCT_PLANS: ProductPlan[] = [
  {
    tier: 'free', name: 'Miễn phí', price: '0đ', total: '5 truyện',
    summary: 'Bắt đầu thư viện đọc cá nhân ngay trên thiết bị.',
    benefits: ['2 truyện từ LilyHub', '3 truyện từ file hoặc website', 'Đọc, nghe và ghi chú ngoại tuyến'],
  },
  {
    tier: 'vip1', name: 'VIP 1', price: '149.000đ / năm', total: '30 truyện',
    summary: 'Dành cho người đọc thường xuyên và muốn gom truyện về một nơi.',
    benefits: ['30 truyện trên thiết bị', 'Nhập từ các nguồn Lily hỗ trợ', 'Đọc và nghe ngoại tuyến', 'Sao lưu và khôi phục thư viện'],
    recommended: true,
  },
  {
    tier: 'vip2', name: 'VIP 2', price: '249.000đ / năm', total: '100 truyện',
    summary: 'Dành cho thư viện lớn và người nghe truyện hằng ngày.',
    benefits: ['100 truyện trên thiết bị', 'Nhập từ các nguồn Lily hỗ trợ', 'Đọc và nghe ngoại tuyến', 'Sao lưu và khôi phục thư viện'],
  },
  {
    name: 'SVIP', price: '349.000đ / năm', total: 'Không giới hạn',
    summary: 'Gói thư viện mở rộng đang được hoàn thiện.',
    benefits: ['Thư viện không giới hạn trên thiết bị', 'Đồng bộ nhiều thiết bị', 'Đồng bộ khoảng 100 truyện dài (tùy độ dài)'],
    pending: true,
  },
];
