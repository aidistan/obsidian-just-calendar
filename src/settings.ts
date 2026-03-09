import Obsidian from 'obsidian';
import Plugin from './main';
import CalendarView from './calendarView';
import { translate as t, default_to as d, CURRENT_LOCALE, WEEKDAYS_ORDER } from './constants';

export class Settings {
	localeOverride: string;
	weekStartingOn: string;
	confirmBeforeCreating: boolean;

	constructor({
		localeOverride = '',
		weekStartingOn = '',
		confirmBeforeCreating = true
	}: {
		localeOverride: string;
		weekStartingOn: string;
		confirmBeforeCreating: boolean;
	}) {
		this.localeOverride = localeOverride;
		this.weekStartingOn = weekStartingOn;
		this.confirmBeforeCreating = confirmBeforeCreating;
	}

	localeOverrideWithLocaleDefault(): string { return this.localeOverride || d('localeOverride') }
	weekStartingOnWithLocaleDefault(): string { return this.weekStartingOn || d('weekStartingOn') }
}

export class SettingTab extends Obsidian.PluginSettingTab {
	plugin: Plugin;

	constructor(app: Obsidian.App, plugin: Plugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Obsidian.Setting(containerEl)
			.setName(t('localeOverrideName'))
			.setDesc(t('localeOverrideDesc'))
			.addDropdown(dropdown => dropdown
				.addOption('', `${t('localeOverrideDefault')} (${CURRENT_LOCALE})`)
				.addOption('en', 'English')
				.addOption('zh', '简体中文')
				.setValue(this.plugin.settings.localeOverride)
				.onChange(async (value) => {
					this.plugin.settings.localeOverride = value;
					await this.plugin.saveSettings();

					CalendarView.setDictionaryFromSettings(this.plugin.settings);
					this.plugin.refreshCalendarViews();
				})
			);

		new Obsidian.Setting(containerEl)
			.setName(t('weekStartingOnName'))
			.setDesc(t('weekStartingOnDesc'))
			.addDropdown(dropdown => dropdown
				.addOption('', `${t('weekStartingOnDefault')} (${t(WEEKDAYS_ORDER[parseInt(this.plugin.settings.weekStartingOnWithLocaleDefault())] as string)
					})`)
				.addOption('0', t('sunday'))
				.addOption('1', t('monday'))
				.addOption('2', t('tuesday'))
				.addOption('3', t('wednesday'))
				.addOption('4', t('thursday'))
				.addOption('5', t('friday'))
				.addOption('6', t('saturday'))
				.setValue(this.plugin.settings.weekStartingOn)
				.onChange(async (value) => {
					this.plugin.settings.weekStartingOn = value;
					await this.plugin.saveSettings();

					this.plugin.refreshCalendarViews();
				}));

		new Obsidian.Setting(containerEl)
			.setName(t('confirmBeforeCreatingName'))
			.setDesc(t('confirmBeforeCreatingDesc'))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.confirmBeforeCreating)
				.onChange(async (value) => {
					this.plugin.settings.confirmBeforeCreating = value;
					await this.plugin.saveSettings();
				}));
	}
}
