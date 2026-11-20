import type {
  ActivityEventCategory,
  ActivityFeedItem,
  FarmPlotProfile,
  PlotEvaluation,
  RegisteredUserProfile,
} from '../types/cropshield';

export type ActivityFilterGroup =
  | 'all'
  | 'alert'
  | 'credit'
  | 'account'
  | 'system';

export function formatActivityTimeLabel(date = new Date()): string {
  return date.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function createActivityEvent(params: {
  category: ActivityEventCategory;
  plotId?: string;
  titleTh: string;
  titleEn: string;
  detailTh: string;
  detailEn: string;
  timestampMs?: number;
  timeLabel?: string;
}): ActivityFeedItem {
  const ts = params.timestampMs ?? Date.now();
  return {
    id: `act-${ts}-${Math.random().toString(36).slice(2, 7)}`,
    timestampMs: ts,
    timeLabel: params.timeLabel ?? formatActivityTimeLabel(new Date(ts)),
    category: params.category,
    ...(params.plotId ? { plotId: params.plotId } : {}),
    titleTh: params.titleTh,
    titleEn: params.titleEn,
    detailTh: params.detailTh,
    detailEn: params.detailEn,
  };
}

export function createSeedActivityFeed(
  plot: FarmPlotProfile,
  evaluation: PlotEvaluation,
  user: RegisteredUserProfile
): ActivityFeedItem[] {
  const now = Date.now();
  const plotTh = plot.name;
  const plotEn = plot.nameEn ?? plot.name;

  return [
    createActivityEvent({
      category: 'nasa',
      plotId: plot.id,
      timestampMs: now - 4 * 60 * 1000,
      titleTh: `อัปเดตข้อมูลดาวเทียม NASA POWER (${evaluation.healthScore}/100)`,
      titleEn: `NASA POWER Satellite Synced (${evaluation.healthScore}/100)`,
      detailTh: `${plotTh} · ${evaluation.riskLabelTh}`,
      detailEn: `${plotEn} · ${evaluation.riskLabelEn ?? evaluation.riskLabelTh}`,
    }),
    createActivityEvent({
      category: 'credit',
      plotId: plot.id,
      timestampMs: now - 14 * 60 * 1000,
      titleTh: `ยืนยันวงเงินสินเชื่อเบื้องต้น ฿${plot.preApprovedCreditLimitThb.toLocaleString('en-US')}`,
      titleEn: `Pre-Approved Credit Verified ฿${plot.preApprovedCreditLimitThb.toLocaleString('en-US')}`,
      detailTh: `ใช้คะแนนสุขภาพแปลงจากดาวเทียมยืนยันสิทธิ์กับ ธ.ก.ส.`,
      detailEn: `Satellite health identity verified with BAAC Partner credit pool.`,
    }),
    createActivityEvent({
      category: 'alert',
      plotId: plot.id,
      timestampMs: now - 28 * 60 * 1000,
      titleTh: `เปิดรับแจ้งเตือนอัตโนมัติ (LINE & SMS)`,
      titleEn: `Auto-Alert Channel Active (LINE & SMS)`,
      detailTh: `${user.lineAccountLabel} · ${user.phoneNumber}`,
      detailEn: `${user.lineAccountLabel} · ${user.phoneNumber}`,
    }),
    createActivityEvent({
      category: 'account',
      plotId: plot.id,
      timestampMs: now - 42 * 60 * 1000,
      titleTh: `เชื่อมต่อบัญชีเกษตรกร: ${user.fullName}`,
      titleEn: `Farm Account Connected: ${user.fullName}`,
      detailTh: `${plotTh} · ${user.phoneNumber}`,
      detailEn: `${plotEn} · ${user.phoneNumber}`,
    }),
  ];
}

export function prependActivityEvents(
  existing: ActivityFeedItem[],
  incoming: ActivityFeedItem | ActivityFeedItem[],
  maxItems = 40
): ActivityFeedItem[] {
  const additions = Array.isArray(incoming) ? incoming : [incoming];
  const merged = [...additions, ...existing];
  merged.sort((a, b) => b.timestampMs - a.timestampMs);
  return merged.slice(0, maxItems);
}

export function filterActivityFeed(
  items: ActivityFeedItem[],
  filter: ActivityFilterGroup
): ActivityFeedItem[] {
  if (filter === 'all') return items;
  if (filter === 'alert') {
    return items.filter(
      (item) => item.category === 'alert' || item.category === 'status'
    );
  }
  if (filter === 'credit') {
    return items.filter(
      (item) => item.category === 'credit' || item.category === 'shield'
    );
  }
  if (filter === 'account') {
    return items.filter((item) => item.category === 'account');
  }
  return items.filter((item) => item.category === 'nasa');
}

export function countActivityByFilter(
  items: ActivityFeedItem[]
): Record<ActivityFilterGroup, number> {
  return {
    all: items.length,
    alert: filterActivityFeed(items, 'alert').length,
    credit: filterActivityFeed(items, 'credit').length,
    account: filterActivityFeed(items, 'account').length,
    system: filterActivityFeed(items, 'system').length,
  };
}

export function countUnreadActivityEvents(
  items: ActivityFeedItem[],
  lastReadTimestampMs: number
): number {
  return items.filter((item) => item.timestampMs > lastReadTimestampMs).length;
}


