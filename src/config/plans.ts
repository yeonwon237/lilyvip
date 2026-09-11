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
    tier: 'free', name: 'MIỄN PHÍ', price: '0đ', total: '5 truyện',
    summary: 'Bắt đầu thư viện đọc cá nhân ngay trên thiết bị.',
    benefits: ['2 truyện từ LilyHub', '3 truyện từ file hoặc website', 'Đọc, nghe và ghi chú ngoại tuyến'],
  },
  {
    tier: 'vip1', name: 'MY30', price: '149.000đ / năm', total: 'Chỉ khoảng 12.500đ / tháng',
    summary: 'Dành cho người đọc thường xuyên và muốn gom truyện về một nơi.',
    benefits: ['30 truyện trên thiết bị', 'Nhập từ các nguồn Lily hỗ trợ', 'Đọc và nghe ngoại tuyến', 'Sao lưu và khôi phục thư viện'],
    recommended: true,
  },
  {
    tier: 'vip2', name: 'MY100', price: '249.000đ / năm', total: 'Chỉ khoảng 20.800đ / tháng',
    summary: 'Dành cho thư viện lớn và người nghe truyện hằng ngày.',
    benefits: ['100 truyện trên thiết bị', 'Nhập từ các nguồn Lily hỗ trợ', 'Đọc và nghe ngoại tuyến', 'Sao lưu và khôi phục thư viện'],
  },
  {
    name: 'MY CLOUD', price: '349.000đ / năm', total: 'Chỉ khoảng 29.100đ / tháng',
    summary: 'Mang thư viện theo bạn trên nhiều thiết bị.',
    benefits: ['Không giới hạn số truyện trên thiết bị', '500 MB lưu truyện trên Cloud', 'Khoảng 200–500 truyện trên Cloud tùy dung lượng', 'Đồng bộ thư viện và tiến độ đọc'],
    pending: true,
  },
];
