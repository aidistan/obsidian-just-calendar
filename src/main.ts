import Obsidian, { moment } from 'obsidian';
import { Settings, SettingTab } from './settings';
import CalendarView from './calendar-view';
import { translate as t } from './constants';

export default class JustCalendarPlugin extends Obsidian.Plugin {
  settings: Settings;

  async onload() {
    await this.loadSettings();

    this.registerView(
      CalendarView.VIEW_TYPE,
      (leaf) => new CalendarView(leaf, this)
    );

    this.addCommand({
      id: 'open-calendar-view',
      name: t('openCalendarView'),
      callback: async () => this.openCalendarView()
    });

    this.addSettingTab(new SettingTab(this.app, this));

    this.registerEvent(
      this.app.workspace.on('file-open', (file: Obsidian.TFile | null) => {
        if (!file) return;

        const { format, folder } = this.dailyNotesOptions;
        const date = moment(file.basename, format, true);
        if (!date.isValid()) return;

        const expectedPath = `${folder}/${file.name}`.replace(/^\//, "");
        if (file.path !== expectedPath) return;

        this.app.workspace.getLeavesOfType(CalendarView.VIEW_TYPE)
          .forEach((leaf) => leaf.view instanceof CalendarView && leaf.view.selectDate(date));
      })
    );
  }

  onUserEnable() {
    void this.openCalendarView();
  }

  onunload() {
  }

  async openCalendarView() {
    const { workspace } = this.app;
    const existingLeaf = workspace.getLeavesOfType(CalendarView.VIEW_TYPE).first();

    if (existingLeaf?.view instanceof CalendarView) {
      await workspace.revealLeaf(existingLeaf);
    } else {
      const newLeaf = workspace.getRightLeaf(false);

      if (newLeaf == null) {
        new Obsidian.Notice('Failed to create a calendar view.');
        return;
      }

      await newLeaf.setViewState({ type: CalendarView.VIEW_TYPE, active: true });
      await workspace.revealLeaf(newLeaf);
    }
  }

  reloadCalendarViews() {
    this.app.workspace.getLeavesOfType(CalendarView.VIEW_TYPE)
      .forEach((leaf) => leaf.view instanceof CalendarView && leaf.view.reload());
  }

  async loadSettings() {
    this.settings = new Settings((await this.loadData() || {}) as Settings);
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  get dailyNotesOptions(): {
    format: string,
    folder: string,
    template: string
  } {
    const dailyNotesPlugin = this.app.internalPlugins.getPluginById('daily-notes');
    if (!dailyNotesPlugin || !dailyNotesPlugin.enabled) {
      new Obsidian.Notice(t('dailyNotesPluginNotEnabled'));
      throw new Error(t('dailyNotesPluginNotEnabled'));
    }

    const options = Object.assign({ folder: '', template: '' }, dailyNotesPlugin.instance.options);
    options.format ||= 'YYYY-MM-DD'; // default format of daily-notes plugin
    return options;
  }
}
