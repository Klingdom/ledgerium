export interface HeaderKV { key: string; value: string }
export interface FrameExemption { source: string; frameAncestors: string }
export const FRAME_EXEMPTIONS: FrameExemption[];
export const BASE_HEADERS: HeaderKV[];
export const FRAME_DENY_HEADERS: HeaderKV[];
export function buildSecurityHeaders(
  exemptions?: FrameExemption[],
): { source: string; headers: HeaderKV[] }[];
