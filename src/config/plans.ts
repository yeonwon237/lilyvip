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
    tier: 'free', get name() { return t("MIỄN PHÍ"); }, get price() { return t("0đ"); }, get total() { return t("15 truyện"); },
    get summary() { return t("Bắt đầu thư viện đọc cá nhân ngay trên thiết bị."); },
    get benefits() { return [t("15 truyện từ LilyHub, file hoặc website"), t("Đọc, nghe và ghi chú ngoại tuyến")]; },
  },
  {
    tier: 'vip1', name: 'MY01', get price() { return t("239.000đ / năm"); }, get total() { return t("Chỉ khoảng 19.900đ / tháng"); },
    get summary() { return t("Dành cho người đọc thường xuyên và muốn gom truyện về một nơi."); },
    get benefits() { return [t("100 truyện trên thiết bị"), t("Nhập từ các nguồn Lily hỗ trợ"), t("Đọc và nghe ngoại tuyến"), t("Sao lưu và khôi phục thư viện")]; },
    recommended: true,
  },
  {
    tier: 'vip2', name: 'MY02', get price() { return t("399.000đ / năm"); }, get total() { return t("Chỉ khoảng 33.250đ / tháng"); },
    get summary() { return t("Dành cho thư viện lớn và người nghe truyện hằng ngày."); },
    get benefits() { return [t("Không giới hạn số truyện trên thiết bị"), t("Nhập từ các nguồn Lily hỗ trợ"), t("Đọc và nghe ngoại tuyến"), t("Sao lưu và khôi phục thư viện")]; },
  },
];
