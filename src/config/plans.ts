import { t } from '../i18n';
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
    tier: 'free', get name() { return t("MIỄN PHÍ"); }, get price() { return t("0đ"); }, get total() { return t("10 truyện"); },
    get summary() { return t("Bắt đầu thư viện đọc cá nhân ngay trên thiết bị."); },
    get benefits() { return [t("3 truyện từ LilyHub"), t("7 truyện từ file hoặc website"), t("Đọc, nghe và ghi chú ngoại tuyến")]; },
  },
  {
    tier: 'vip1', name: 'MY50', get price() { return t("149.000đ / năm"); }, get total() { return t("Chỉ khoảng 12.500đ / tháng"); },
    get summary() { return t("Dành cho người đọc thường xuyên và muốn gom truyện về một nơi."); },
    get benefits() { return [t("50 truyện trên thiết bị"), t("Nhập từ các nguồn Lily hỗ trợ"), t("Đọc và nghe ngoại tuyến"), t("Sao lưu và khôi phục thư viện")]; },
    recommended: true,
  },
  {
    tier: 'vip2', name: 'MY100', get price() { return t("249.000đ / năm"); }, get total() { return t("Chỉ khoảng 20.800đ / tháng"); },
    get summary() { return t("Dành cho thư viện lớn và người nghe truyện hằng ngày."); },
    get benefits() { return [t("100 truyện trên thiết bị"), t("Nhập từ các nguồn Lily hỗ trợ"), t("Đọc và nghe ngoại tuyến"), t("Sao lưu và khôi phục thư viện")]; },
  },
  {
    name: 'MY CLOUD', get price() { return t("349.000đ / năm"); }, get total() { return t("Chỉ khoảng 29.100đ / tháng"); },
    get summary() { return t("Mang thư viện theo bạn trên nhiều thiết bị."); },
    get benefits() { return [t("Không giới hạn số truyện trên thiết bị"), t("500 MB lưu truyện trên Cloud"), t("Khoảng 200–500 truyện trên Cloud tùy dung lượng"), t("Đồng bộ thư viện và tiến độ đọc")]; },
    pending: true,
  },
];
