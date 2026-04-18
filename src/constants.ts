import { getLanguage } from 'obsidian';

export const LOCALES = {
  en: {
    // Plugin & Views

    'openCalendarView': 'Open calendar view',
    'dailyNotesPluginNotEnabled': 'Daily notes plugin is not enabled.',
    'createDailyNoteHeading': 'Create Daily Note',
    'createDailyNoteContent': (filePath: string) => `File ${filePath} does not exist. Would you like to create it?`,
    'failedToCreateDailyNote': 'Failed to create daily note.',

    // Settings

    'localeOverrideName': 'Override locale:',
    'localeOverrideDesc': 'Set this if you want to use a locale different from the default',
    'localeOverrideDefault': 'Display language',

    'weekStartingOnName': 'Start week on:',
    'weekStartingOnDesc': 'Choose what day of the week to start. Select \'Locale default\' to use the default specified by Moment.js',
    'weekStartingOnDefault': 'Local default',

    'confirmBeforeCreatingName': 'Confirm before creating new diary note:',
    'confirmBeforeCreatingDesc': 'Show a confirmation modal before creating a new diary note',

    // Others

    'january': 'January',
    'february': 'February',
    'march': 'March',
    'april': 'April',
    'may': 'May',
    'june': 'June',
    'july': 'July',
    'august': 'August',
    'september': 'September',
    'october': 'October',
    'november': 'November',
    'december': 'December',
    'jan.': 'Jan',
    'feb.': 'Feb',
    'mar.': 'Mar',
    'apr.': 'Apr',
    'may.': 'May',
    'jun.': 'Jun',
    'jul.': 'Jul',
    'aug.': 'Aug',
    'sep.': 'Sep',
    'oct.': 'Oct',
    'nov.': 'Nov',
    'dec.': 'Dec',

    'sunday': 'Sunday',
    'monday': 'Monday',
    'tuesday': 'Tuesday',
    'wednesday': 'Wednesday',
    'thursday': 'Thursday',
    'friday': 'Friday',
    'saturday': 'Saturday',
    'sun.': 'S',
    'mon.': 'M',
    'tue.': 'T',
    'wed.': 'W',
    'thu.': 'T',
    'fri.': 'F',
    'sat.': 'S',

    'done': 'Done',
    'reset': 'Reset',
    'create': 'Create',
    'cancel': 'Cancel',
    'neverAskAgain': 'Never ask again',
  },

  zh: {
    // 插件和视图

    'openCalendarView': '打开日历视图',
    'dailyNotesPluginNotEnabled': '日记插件未启用',
    'createDailyNoteHeading': '创建日记',
    'createDailyNoteContent': (filePath: string) => `文件 ${filePath} 尚不存在。确认创建吗?`,
    'failedToCreateDailyNote': '日记创建失败',

    // 设置

    'localeOverrideName': '日历语言:',
    'localeOverrideDesc': '如果你想使用与 Obsidian 界面不同的语言，请设置此项',
    'localeOverrideDefault': '跟随界面',

    'weekStartingOnName': '每周开始于:',
    'weekStartingOnDesc': '选择每周从哪一天开始。选择"本地惯例"以使用 Moment.js 指定的默认值',
    'weekStartingOnDefault': '跟随语言',

    'confirmBeforeCreatingName': '创建新日记前确认:',
    'confirmBeforeCreatingDesc': '在创建新日记之前显示确认对话框',

    // 其他

    'january': '一月',
    'february': '二月',
    'march': '三月',
    'april': '四月',
    'may': '五月',
    'june': '六月',
    'july': '七月',
    'august': '八月',
    'september': '九月',
    'october': '十月',
    'november': '十一月',
    'december': '十二月',
    'jan.': '一月',
    'feb.': '二月',
    'mar.': '三月',
    'apr.': '四月',
    'may.': '五月',
    'jun.': '六月',
    'jul.': '七月',
    'aug.': '八月',
    'sep.': '九月',
    'oct.': '十月',
    'nov.': '十一月',
    'dec.': '十二月',

    'sunday': '周日',
    'monday': '周一',
    'tuesday': '周二',
    'wednesday': '周三',
    'thursday': '周四',
    'friday': '周五',
    'saturday': '周六',
    'sun.': '日',
    'mon.': '一',
    'tue.': '二',
    'wed.': '三',
    'thu.': '四',
    'fri.': '五',
    'sat.': '六',

    'done': '搞定',
    'reset': '重置',
    'create': '创建',
    'cancel': '取消',
    'neverAskAgain': '不再询问',
  },
} as const;

export const LOCALE_DEFAULTS = {
  en: {
    'localeOverride': 'en',
    'weekStartingOn': '0',
  },
  zh: {
    'localeOverride': 'zh',
    'weekStartingOn': '1',
  },
} as const;

export const CURRENT_LOCALE = getLanguage() in LOCALES ? getLanguage() as keyof typeof LOCALES : 'en';
export const WEEKDAYS_ORDER = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export function translate(key: string, ...args: string[]): string {
  const dict = LOCALES[CURRENT_LOCALE] as Record<string, string | ((...args: string[]) => string)>;
  const value = dict[key];
  return typeof value === 'function' ? value(...args) : value ?? '';
}

export function default_to(key: string): string {
  const dict = LOCALE_DEFAULTS[CURRENT_LOCALE];
  return dict[key as keyof typeof dict] ?? '';
}
