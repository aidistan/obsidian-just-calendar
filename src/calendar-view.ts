import Obsidian, { moment } from 'obsidian';
import { Application } from '@hotwired/stimulus';
import Plugin from './main';
import CalendarController from './calendar-controller';
import { translate as t } from './constants';

export default class CalendarView extends Obsidian.ItemView {
  public static readonly VIEW_TYPE = 'calendar-view';

  public readonly icon = 'calendar-days';

  private stimulusApp: Application;

  constructor(leaf: Obsidian.WorkspaceLeaf, public plugin: Plugin) {
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
    this.stimulusApp = Application.start(this.contentEl);
    this.stimulusApp.register('calendar', CalendarController);
    this.reload();
    return Promise.resolve();
  }

  async onClose() {
    this.stimulusApp.stop();
    return Promise.resolve();
  }

  public reload() {
    this.contentEl.empty();
    this.contentEl.createDiv({
      cls: 'calendar',
      attr: {
        'data-controller': 'calendar',
        'data-calendar-locale-value': this.plugin.settings.localeOverrideWithLocaleDefault(),
        'data-calendar-starting-on-value': this.plugin.settings.weekStartingOnWithLocaleDefault().toString(),
        'data-calendar-selected-date-value': '',
        'data-calendar-viewing-date-value': moment().format('YYYY-MM-DD'),
        'data-calendar-view-type-value': 'days',
        'data-action': 'wheel->calendar#scroll'
      }
    }, (calendar) => {
      calendar.createDiv({ cls: 'calendar-header' }, (header) => {
        header.createDiv({ cls: 'calendar-title' }, (title) => {
          title.createEl('button', { attr: { type: 'button', 'data-calendar-target': 'month', 'data-action': 'calendar#toggleView' } });
          title.createEl('button', { attr: { type: 'button', 'data-calendar-target': 'year', 'data-action': 'calendar#toggleView' } });
        });
        header.createDiv({ cls: 'calendar-navigation' }, (nav) => {
          nav.createEl('button', { attr: { type: 'button', 'data-action': 'calendar#prev' } });
          nav.createEl('button', { attr: { type: 'button', 'data-action': 'calendar#next' } });
          nav.createEl('button', { attr: { type: 'button', 'data-action': 'calendar#today' } });
        });
      });
      calendar.createDiv({ cls: 'calendar-container', attr: { 'data-calendar-target': 'container' } }, (container) => {
        container.createDiv({ cls: 'calendar-weekdays', attr: { 'data-calendar-target': 'weekdays' } });
        container.createDiv({ cls: 'calendar-content', attr: { 'data-calendar-target': 'contents' } });
      });
    });

    // Inject current instance into CalendarController
    setTimeout(() => {
      const el = this.contentEl.querySelector('[data-controller="calendar"]');
      if (el === null) return;

      const controller = this.stimulusApp.getControllerForElementAndIdentifier(el, "calendar") as CalendarController;
      if (controller === null) return;

      controller.parentView = this;
    }, 100);
  }

  public selectDate(date: moment.Moment) {
    this.containerEl.querySelector('[data-controller="calendar"]')
      ?.setAttribute('data-calendar-selected-date-value', date.format('YYYY-MM-DD'));
  }

  public async openDailyNote(date: moment.Moment, newLeaf: boolean) {
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
        })(this.app).open());

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
          const templateFile = this.app.vault.getAbstractFileByPath(options.template + '.md');
          if (templateFile instanceof Obsidian.TFile) {
            content = (await this.app.vault.read(templateFile))
              .replace(/{{\s*title\s*}}/g, date.format(options.format))
              .replace(/{{\s*date\s*(:\s*([^}]+))?}}/g, (...[, , format]: string[]) => date.format(format || "YYYY-MM-DD"))
              .replace(/{{\s*time\s*(:\s*([^}]+))?}}/g, (...[, , format]: string[]) => moment().format(format || "HH:mm"))
          }
        }

        // Ensure folder exists
        if (options.folder && !(this.app.vault.getAbstractFileByPath(options.folder))) {
          await this.app.vault.createFolder(options.folder);
        }

        file = await this.app.vault.create(filePath, content);
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
