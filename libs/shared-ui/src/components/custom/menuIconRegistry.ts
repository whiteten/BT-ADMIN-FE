import type { ComponentType, SVGProps } from 'react';
import { Activity, Bot, Database } from 'lucide-react';
import {
  IconAlertTriangle,
  IconAoe,
  IconBookmark,
  IconBot,
  IconBubble,
  IconCalendar,
  IconChartLine,
  IconDataEmpty,
  IconDocument,
  IconEdit,
  IconEntity,
  IconEvaluation,
  IconFaq,
  IconGrid,
  IconIntent,
  IconLayer,
  IconList,
  IconMenuBotCommon,
  IconMenuBotConfig,
  IconMenuDashboard,
  IconMenuItemsPlus,
  IconMenuMain,
  IconMenuStatistics,
  IconMoreVertical,
  IconPlayCircle,
  IconRetrain,
  IconRollback,
  IconSearch,
  IconSend,
  IconSlidersHorizontal,
  IconSnapshot,
  IconSynonyms,
  IconTag,
  IconTalk,
  IconTrash,
} from './Icons';

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

const customIcons: Record<string, IconComponent> = {
  IconAlertTriangle,
  IconAoe,
  IconBookmark,
  IconBot,
  IconBubble,
  IconCalendar,
  IconChartLine,
  IconDataEmpty,
  IconDocument,
  IconEdit,
  IconEntity,
  IconEvaluation,
  IconFaq,
  IconGrid,
  IconIntent,
  IconLayer,
  IconList,
  IconMenuBotCommon,
  IconMenuBotConfig,
  IconMenuDashboard,
  IconMenuItemsPlus,
  IconMenuMain,
  IconMenuStatistics,
  IconMoreVertical,
  IconPlayCircle,
  IconRetrain,
  IconRollback,
  IconSearch,
  IconSend,
  IconSlidersHorizontal,
  IconSnapshot,
  IconSynonyms,
  IconTag,
  IconTalk,
  IconTrash,
};

const lucideIcons: Record<string, IconComponent> = {
  Activity,
  Bot,
  Database,
};

const withPrefix = (prefix: string, map: Record<string, IconComponent>): Record<string, IconComponent> =>
  Object.fromEntries(Object.entries(map).map(([key, value]) => [`${prefix}:${key}`, value]));

export const menuIconRegistry: Record<string, IconComponent> = {
  ...withPrefix('custom', customIcons),
  ...withPrefix('lucide', lucideIcons),
};

export type MenuIconKey = keyof typeof menuIconRegistry;

export const resolveMenuIcon = (key?: string): IconComponent | undefined => {
  if (!key) return undefined;
  return menuIconRegistry[key];
};
