// Project and Segment types for the video automation agent

export type AspectRatio = '16:9' | '1:1' | '3:4' | '9:16';

export type ProjectStatus = 
  | 'settings'    // Step 1
  | 'script'      // Step 2
  | 'voice'       // Step 3
  | 'image'       // Step 4
  | 'video'       // Step 5
  | 'preview'     // Step 6
  | 'completed';

export interface Project {
  id: string;
  title: string;
  topic: string;
  aspectRatio: AspectRatio;
  style: string;
  status: ProjectStatus;
  duration: number; // seconds
  videoUrl?: string;
  thumbnailUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Segment {
  id: string;
  projectId: string;
  orderIndex: number;
  scriptText: string;
  audioUrl?: string;
  imageUrl?: string;
  videoUrl?: string;
  durationMs?: number;
  createdAt: Date;
}

export interface StylePreset {
  id: string;
  name: string;
  thumbnail: string;
  prompt: string;
}

export interface VoiceOption {
  id: string;
  name: string;
  gender: 'male' | 'female';
  preview?: string;
}

// Step navigation
export const WIZARD_STEPS = [
  { id: 1, path: '/create', label: '영상 설정' },
  { id: 2, path: '/create/script', label: '대본 작성' },
  { id: 3, path: '/create/voice', label: '음성 생성' },
  { id: 4, path: '/create/image', label: '이미지 생성' },
  { id: 5, path: '/create/video', label: '영상 생성' },
  { id: 6, path: '/create/preview', label: '영상 확인' },
] as const;
