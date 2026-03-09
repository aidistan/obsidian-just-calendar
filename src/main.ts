import { Notice, Plugin, WorkspaceLeaf } from 'obsidian';
import { Settings, SettingTab } from './settings';
import CalendarView from './calendarView';
import { translate as t } from './constants';

export default class JustCalendarPlugin extends Plugin {
	settings: Settings;

	async onload() {
		await this.loadSettings();
		CalendarView.setDictionaryFromSettings(this.settings);

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
	}

	onUserEnable() {
		this.openCalendarView();
	}

	onunload() {
	}

	async openCalendarView() {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(CalendarView.VIEW_TYPE);

		if (leaves.length > 0) {
			leaf = leaves[0]!;
		} else {
			leaf = workspace.getRightLeaf(false);

			if (leaf == null) {
				new Notice('Failed to create a calendar view.');
				return;
			}

			await leaf.setViewState({ type: CalendarView.VIEW_TYPE, active: true });
		}

		// Reveal the leaf in case it is in a collapsed sidebar
		workspace.revealLeaf(leaf);
	}

	refreshCalendarViews() {
		this.app.workspace.getLeavesOfType(CalendarView.VIEW_TYPE).forEach(
			(leaf) => leaf.view instanceof CalendarView && leaf.view.render())
	}

	async loadSettings() {
		this.settings = new Settings(await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	get dailyNotesOptions() : {
		format: any,
		folder: any,
		template: any
	} {
		const dailyNotesPlugin = this.app.internalPlugins.getPluginById('daily-notes');
		if (!dailyNotesPlugin || !dailyNotesPlugin.enabled) {
			new Notice(t('dailyNotesPluginNotEnabled'));
			throw new Error(t('dailyNotesPluginNotEnabled'));
		}

		return Object.assign({
			format: 'YYYY-MM-DD',
			folder: '',
			template: ''
		}, dailyNotesPlugin.instance.options);
	}
}
