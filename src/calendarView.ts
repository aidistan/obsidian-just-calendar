import Obsidian, { moment } from 'obsidian';
import CalendarJS from '@calendarjs/ce';
import Plugin from './main';
import { Settings } from './settings';
import { LOCALES, translate as t } from './constants';

export default class CalendarView extends Obsidian.ItemView {
  public static readonly VIEW_TYPE = 'calendar-view';

  private static readonly DICTIONARY_KEYS = {
    'January': 'jan.',
    'February': 'feb.',
    'March': 'mar.',
    'April': 'apr.',
    'May': 'may.',
    'June': 'jun.',
    'July': 'jul.',
    'August': 'aug.',
    'September': 'sep.',
    'October': 'oct.',
    'November': 'nov.',
    'December': 'dec.',
    'Sunday': 'sun.',
    'Monday': 'mon.',
    'Tuesday': 'tue.',
    'Wednesday': 'wed.',
    'Thursday': 'thu.',
    'Friday': 'fri.',
    'Saturday': 'sat.',
    'Done': 'done',
    'Reset': 'reset'
  };

  public static setDictionaryFromSettings(settings: Settings) {
    const locale = settings.localeOverrideWithLocaleDefault() as keyof typeof LOCALES;

    const dict: Record<string, string> = {};
    for (const [key, value] of Object.entries(this.DICTIONARY_KEYS)) {
      dict[key] = LOCALES[locale][value as keyof typeof LOCALES['en']] as string;
    }

    CalendarJS.setDictionary(dict);
  }

  public readonly icon = 'calendar-days';

  // Instance of CalendarJS.Calendar
  private calendar: ReturnType<typeof CalendarJS.Calendar>;

  // HACK: Latest captured mouse event as a substitute for `app.lastEvent`
  private lastUserEvent: Obsidian.UserEvent | null = null;

  constructor(leaf: Obsidian.WorkspaceLeaf, private plugin: Plugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType() {
    return CalendarView.VIEW_TYPE;
  }

  getDisplayText() {
    return 'Calendar view';
  }

  async onOpen() {
    // HACK: Capture mouse event manually due to `app.lastEvent` not working in CalendarJS
    this.contentEl.addEventListener('mousedown', (e: Obsidian.UserEvent) => this.lastUserEvent = e, true);

    return Promise.resolve(this.reload());
  }

  async onClose() {
  }

  reload() {
    this.contentEl.empty();

    this.calendar = CalendarJS.Calendar(this.contentEl, {
      type: 'inline',
      footer: false,
      startingDay: parseInt(this.plugin.settings.weekStartingOnWithLocaleDefault()),
      onchange: (_: object, value: string) =>this.onDateUpdated(moment(value))
    });

    // HACK: Call onDateUpdated again in case of clicks on already selected dates
    // https://github.com/aidistan/obsidian-just-calendar/issues/2
    this.contentEl.addEventListener('click', (e: MouseEvent) => {
      const content = this.contentEl.querySelector('.lm-calendar-content');
      const target = e.target as HTMLElement;
      const date = this.calendar.getValue?.();

      if (target.parentNode === content && date) {
        this.onDateUpdated(moment(date));
      }
    });

    // HACK: Force to update .lm-calendar-content
    // https://github.com/aidistan/obsidian-just-calendar/issues/1
    this.calendar.setView?.('months');
    this.calendar.setView?.('days');

    const todayBtn = this.contentEl.querySelector('.lm-calendar-navigation')?.createEl('button', {
      text: '\ue8df',
      cls: ['lm-calendar-icon', 'lm-ripple'],
      attr: {
        type: 'button',
        tabindex: '0'
      }
    });
    todayBtn?.addEventListener('click', (_: MouseEvent) => this.calendar.setValue?.(moment().format('YYYY-MM-DD')));
    todayBtn?.click();
  }

  public updateDate(date: moment.Moment) {
    if (this.calendar && date.isValid()) {
      this.calendar.setValue?.(date.format('YYYY-MM-DD'));
    }
  }

  onDateUpdated(date: moment.Moment) {
    const isModPressed = this.lastUserEvent
      ? Obsidian.Keymap.isModifier(this.lastUserEvent, 'Mod')
      : false;

    if (date.isValid()) {
      void this.openDailyNote(date, isModPressed);
    }

    this.lastUserEvent = null;
  }

  private async openDailyNote(date: moment.Moment, newLeaf: boolean) {
    const { app } = this;
    const options = this.plugin.dailyNotesOptions;
    const filePath = `${options.folder}/${date.format(options.format)}.md`.replace(/^\//, "");
    let file = this.app.vault.getAbstractFileByPath(filePath);

    // Skip if already opened and been focusing
    if (file) {
      const view = this.app.workspace.getLeaf().view;
      if (view instanceof Obsidian.FileView) {
        if (view.file?.path === filePath) return;
      }

      // Try to create if not exists
    } else {
      if (this.plugin.settings.confirmBeforeCreating) {
        let neverAskAgain = false;
        const confirmed = await new Promise((resolve) => new (class extends Obsidian.Modal {
          constructor(app: Obsidian.App) {
            super(app);
            this.setTitle(t('createDailyNoteHeading'));
            new Obsidian.Setting(this.contentEl)
              .setName(t('createDailyNoteContent', filePath));
            new Obsidian.Setting(this.contentEl)
              .setName(t('neverAskAgain'))
              .addToggle(toggle => toggle.onChange(value => { neverAskAgain = value; }));
            new Obsidian.Setting(this.contentEl)
              .addButton(btn => btn.setButtonText(t('cancel')).onClick(() => { resolve(false); this.close(); }))
              .addButton(btn => btn.setButtonText(t('create')).setClass('mod-cta').onClick(() => { resolve(true); this.close(); }));
          }
        })(app).open());

        if (!confirmed) return;

        if (neverAskAgain) {
          this.plugin.settings.confirmBeforeCreating = false;
          await this.plugin.saveSettings();
        }
      }

      try {
        let content = '';

        // Use template if available
        if (options.template) {
          const templateFile = app.vault.getAbstractFileByPath(options.template + '.md');
          if (templateFile instanceof Obsidian.TFile) {
            content = (await app.vault.read(templateFile))
              .replace(/{{\s*title\s*}}/g, date.format(options.format))
              .replace(/{{\s*date\s*(:\s*([^}]+))?}}/g, (...[, , format]: string[]) => date.format(format || "YYYY-MM-DD"))
              .replace(/{{\s*time\s*(:\s*([^}]+))?}}/g, (...[, , format]: string[]) => moment().format(format || "HH:mm"))
          }
        }

        // Ensure folder exists
        if (options.folder && !(app.vault.getAbstractFileByPath(options.folder))) {
          await app.vault.createFolder(options.folder);
        }

        file = await app.vault.create(filePath, content);
      } catch {
        new Obsidian.Notice(t('failedToCreateDailyNote'));
        return;
      }
    }

    if (file instanceof Obsidian.TFile) {
      await this.app.workspace.getLeaf(newLeaf).openFile(file);
    }
  }
}
