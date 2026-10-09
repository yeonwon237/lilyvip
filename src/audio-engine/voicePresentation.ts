import { t } from '../i18n';
import { VoiceInfo } from './types';

export interface VoicePresentation {
  name: string;
  description: string;
}

const LILY_VOICE_PRESENTATION: Record<string, VoicePresentation> = {
  ngochuyen: { get name() { return t("Lily Huyền"); }, get description() { return t("Trong trẻo · truyền cảm"); } },
  ngochuyennew: { get name() { return t("Lily Huyền 2"); }, get description() { return t("Mượt mà · giàu cảm xúc"); } },
  maiphuong: { name: 'Lily Mai', get description() { return t("Dịu dàng · ấm áp"); } },
  minhkhang: { name: 'Lily Khang', get description() { return t("Trầm ấm · rõ ràng"); } },
  manhdung: { get name() { return t("Lily Dũng"); }, get description() { return t("Điềm tĩnh · chắc giọng"); } },
  minhthu: { name: 'Lily Thu', get description() { return t("Nhẹ nhàng · tự nhiên"); } },
  vietthao3886: { get name() { return t("Lily Thảo"); }, get description() { return t("Êm dịu · kể chuyện"); } },
};

export function getVoicePresentation(voiceId: string, fallback?: Partial<VoiceInfo>): VoicePresentation {
  if (LILY_VOICE_PRESENTATION[voiceId]) return LILY_VOICE_PRESENTATION[voiceId];
  if (voiceId.startsWith('sys_')) {
    return { name: t("Giọng thiết bị"), description: t("Giọng có sẵn trên thiết bị này") };
  }
  return {
    name: fallback?.name || t("Giọng Lily"),
    description: fallback?.description || t("Giọng đọc tự nhiên"),
  };
}

export function presentVoice(voice: VoiceInfo): VoiceInfo {
  const presentation = getVoicePresentation(voice.id, voice);
  return { ...voice, name: presentation.name, description: presentation.description };
}
