import { VoiceInfo } from './types';

export interface VoicePresentation {
  name: string;
  description: string;
}

const LILY_VOICE_PRESENTATION: Record<string, VoicePresentation> = {
  ngochuyen: { name: 'Lily Huyền', description: 'Trong trẻo · truyền cảm' },
  ngochuyennew: { name: 'Lily Huyền 2', description: 'Mượt mà · giàu cảm xúc' },
  maiphuong: { name: 'Lily Mai', description: 'Dịu dàng · ấm áp' },
  minhkhang: { name: 'Lily Khang', description: 'Trầm ấm · rõ ràng' },
  manhdung: { name: 'Lily Dũng', description: 'Điềm tĩnh · chắc giọng' },
  minhthu: { name: 'Lily Thu', description: 'Nhẹ nhàng · tự nhiên' },
  vietthao3886: { name: 'Lily Thảo', description: 'Êm dịu · kể chuyện' },
};

export function getVoicePresentation(voiceId: string, fallback?: Partial<VoiceInfo>): VoicePresentation {
  if (LILY_VOICE_PRESENTATION[voiceId]) return LILY_VOICE_PRESENTATION[voiceId];
  if (voiceId.startsWith('sys_')) {
    return { name: 'Giọng thiết bị', description: 'Giọng có sẵn trên thiết bị này' };
  }
  return {
    name: fallback?.name || 'Giọng Lily',
    description: fallback?.description || 'Giọng đọc tự nhiên',
  };
}

export function presentVoice(voice: VoiceInfo): VoiceInfo {
  const presentation = getVoicePresentation(voice.id, voice);
  return { ...voice, name: presentation.name, description: presentation.description };
}
