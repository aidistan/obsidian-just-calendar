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

  public icon = 'calendar';
  private plugin: Plugin;
  private calendar: ReturnType<typeof CalendarJS.Calendar>;

  constructor(leaf: Obsidian.WorkspaceLeaf, plugin: Plugin) {
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
    return Promise.resolve(this.render());
  }

  async onClose() {
  }

  render() {
    const container = this.contentEl;
    container.empty();

    // Capture mouse event manually due to `app.lastEvent` not working in CalendarJS
    let lastUserEvent: Obsidian.UserEvent | null = null;
    container.addEventListener('mousedown', (e: Obsidian.UserEvent) => lastUserEvent = e, true);

    this.calendar = CalendarJS.Calendar(container, {
      type: 'inline',
      footer: false,
      startingDay: parseInt(this.plugin.settings.weekStartingOnWithLocaleDefault()),
      onchange: (_: object, value: string) => {
        const date = moment(value);
        const isModPressed = lastUserEvent
          ? Obsidian.Keymap.isModifier(lastUserEvent, 'Mod')
          : false;

        if (date.isValid()) {
          void this.openDailyNote(date, isModPressed);
        }

        lastUserEvent = null;
      }
    });

    // HACK: refer to aidistan/obsidian-just-calendar#1
    this.calendar.setView?.('months');
    this.calendar.setView?.('days');

    const todayBtn = container.querySelector('.lm-calendar-navigation')?.createEl('button', {
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

  private async openDailyNote(date: moment.Moment, isModPressed: boolean) {
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
        const confirmed = await new Promise((resolve) => new (class extends Obsidian.Modal {
          constructor(app: Obsidian.App) {
            super(app);
            this.contentEl.createEl('h2', { text: t('createDailyNoteHeading') });
            this.contentEl.createEl('p', { text: t('createDailyNoteContent', filePath) });
            this.contentEl.createDiv("modal-button-container", (containerEl) => {
              containerEl.createEl('button', { text: t('cancel') })
                .onclick = () => { resolve(false); this.close(); };
              containerEl.createEl('button', { text: t('create'), cls: "mod-cta", })
                .onclick = () => { resolve(true); this.close(); };
            });
          }
        })(app).open());

        if (!confirmed) return;
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
      await this.app.workspace.getLeaf(isModPressed).openFile(file);
    }
  }
}
