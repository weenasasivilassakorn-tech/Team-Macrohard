import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Bell,
  ChevronDown,
  ChevronUp,
  Satellite,
  ShieldCheck,
  UserCheck,
  Wallet,
} from 'lucide-react';
import type {
  ActivityEventCategory,
  ActivityFeedItem,
  AppLanguage,
} from '../types/cropshield';
import {
  type ActivityFilterGroup,
  countActivityByFilter,
  filterActivityFeed,
} from '../utils/activityFeed';
import { APP_COPY } from '../utils/i18n';

interface ActivityFeedCardProps {
  lang: AppLanguage;
  items: ActivityFeedItem[];
  inModal?: boolean;
  unreadBeforeOpenMs?: number;
}

const CATEGORY_STYLE: Record<
  ActivityEventCategory,
  {
    icon: React.FC<{ className?: string }>;
    iconBoxClass: string;
  }
> = {
  credit: {
    icon: Wallet,
    iconBoxClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  shield: {
    icon: ShieldCheck,
    iconBoxClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  status: {
    icon: AlertTriangle,
    iconBoxClass: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  alert: {
    icon: Bell,
    iconBoxClass: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  nasa: {
    icon: Satellite,
    iconBoxClass: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  account: {
    icon: UserCheck,
    iconBoxClass: 'bg-slate-100 text-slate-700 border-slate-200',
  },
};

export const ActivityFeedCard: React.FC<ActivityFeedCardProps> = ({
  lang,
  items,
  inModal = false,
  unreadBeforeOpenMs,
}) => {
  const copy = APP_COPY[lang].activityFeed;
  const [filter, setFilter] = useState<ActivityFilterGroup>('all');
  const [expanded, setExpanded] = useState<boolean>(false);

  const tabCounts = useMemo(() => countActivityByFilter(items), [items]);
  const filteredItems = useMemo(
    () => filterActivityFeed(items, filter),
    [items, filter]
  );

  const initialLimit = inModal ? 8 : 5;
  const visibleItems = expanded
    ? filteredItems
    : filteredItems.slice(0, initialLimit);

  const tabs: ReadonlyArray<{
    id: ActivityFilterGroup;
    label: string;
    icon: React.FC<{ className?: string }>;
  }> = [
    { id: 'all', label: copy.filterAll, icon: Activity },
    { id: 'alert', label: copy.filterAlert, icon: Bell },
    { id: 'credit', label: copy.filterCredit, icon: Wallet },
    { id: 'account', label: copy.filterAccount, icon: UserCheck },
    { id: 'system', label: copy.filterSystem, icon: Satellite },
  ];

  return (
    <section
      data-testid="activity-feed-card"
      aria-labelledby={inModal ? undefined : 'activity-feed-heading'}
      className={
        inModal
          ? 'space-y-3.5'
          : 'bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-4'
      }
    >
      {/* Header & Category Tab Navigation */}
      <div className="space-y-3">
        {!inModal && (
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
              <h2
                id="activity-feed-heading"
                className="text-base font-bold text-slate-900 tracking-tight"
              >
                {copy.title}
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              {copy.subtitle}
            </p>
          </div>
        )}

        <div
          role="tablist"
          aria-label="Activity categories"
          className="flex items-center border-b border-slate-200 overflow-x-auto -mx-1 px-1"
        >
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            const isActive = filter === tab.id;
            const count = tabCounts[tab.id];

            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`activity-tab-${tab.id}`}
                aria-selected={isActive}
                aria-controls="activity-feed-tabpanel"
                data-testid={`activity-filter-${tab.id}`}
                onClick={() => {
                  setFilter(tab.id);
                  setExpanded(false);
                }}
                className={`relative min-h-[40px] flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-600 ${
                  isActive
                    ? 'border-emerald-700 text-emerald-800'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <TabIcon className="w-3.5 h-3.5 shrink-0 hidden sm:inline-block" aria-hidden="true" />
                <span>{tab.label}</span>
                <span
                  className={`text-[11px] font-mono tabular-nums ${
                    isActive ? 'text-emerald-700 font-bold' : 'text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chronological Timeline List */}
      <div
        id="activity-feed-tabpanel"
        role="tabpanel"
        aria-labelledby={`activity-tab-${filter}`}
      >
        {visibleItems.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl">
            {copy.emptyFilter}
          </div>
        ) : (
          <ol className="divide-y divide-slate-100" data-testid="activity-feed-list">
          {visibleItems.map((item) => {
            const style = CATEGORY_STYLE[item.category];
            const Icon = style.icon;
            const titleText = lang === 'th' ? item.titleTh : item.titleEn;
            const detailText = lang === 'th' ? item.detailTh : item.detailEn;
            const isUnread =
              typeof unreadBeforeOpenMs === 'number' &&
              item.timestampMs > unreadBeforeOpenMs;

            return (
              <li
                key={item.id}
                data-testid="activity-feed-item"
                className={`py-3 first:pt-1 last:pb-1 flex items-start gap-3 ${
                  isUnread ? 'bg-amber-50/40 -mx-2 px-2 rounded-xl' : ''
                }`}
              >
                <div
                  className={`relative w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${style.iconBoxClass}`}
                >
                  <Icon className="w-4 h-4" aria-hidden="true" />
                  {isUnread && (
                    <span
                      className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-600 ring-2 ring-white"
                      aria-label={copy.newTag}
                    />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs sm:text-sm font-semibold text-slate-900 leading-snug">
                      {titleText}
                    </p>
                    <time className="text-[11px] font-mono tabular-nums text-slate-400 shrink-0 pt-0.5">
                      {item.timeLabel}
                    </time>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                    {detailText}
                  </p>
                </div>
              </li>
            );
          })}
          </ol>
        )}
      </div>

      {/* Expand / Collapse Footer */}
      {filteredItems.length > initialLimit && (
        <div className="pt-1 border-t border-slate-100">
          <button
            type="button"
            data-testid="activity-expand-btn"
            onClick={() => setExpanded((prev) => !prev)}
            className="min-h-[40px] w-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors"
          >
            {expanded ? (
              <>
                <ChevronUp className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{copy.showLess}</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>
                  {copy.showMore} ({filteredItems.length})
                </span>
              </>
            )}
          </button>
        </div>
      )}
    </section>
  );
};

