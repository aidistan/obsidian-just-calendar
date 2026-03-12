import Obsidian, { moment } from 'obsidian';
import { Settings, SettingTab } from './settings';
import CalendarView from './calendarView';
import { translate as t } from './constants';

export default class JustCalendarPlugin extends Obsidian.Plugin {
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

		this.registerEvent(
			this.app.workspace.on('file-open', (file: Obsidian.TFile | null) => {
				if (!file) return;

				const { format, folder } = this.dailyNotesOptions;
				const date = moment(file.basename, format, true);
				if (!date.isValid()) return;

				const expectedPath = `${folder}/${file.name}`.replace(/^\//, "");
				if (file.path !== expectedPath) return;

				this.app.workspace.getLeavesOfType(CalendarView.VIEW_TYPE)
					.forEach((leaf) => (leaf.view as CalendarView).updateDate(date))
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

		let leaf: Obsidian.WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(CalendarView.VIEW_TYPE);

		if (leaves.length > 0) {
			leaf = leaves[0]!;
		} else {
			leaf = workspace.getRightLeaf(false);

			if (leaf == null) {
				new Obsidian.Notice('Failed to create a calendar view.');
				return;
			}

			await leaf.setViewState({ type: CalendarView.VIEW_TYPE, active: true });
		}

		// Reveal the leaf in case it is in a collapsed sidebar
		await workspace.revealLeaf(leaf);
	}

	refreshCalendarViews() {
		this.app.workspace.getLeavesOfType(CalendarView.VIEW_TYPE)
			.forEach((leaf) => (leaf.view as CalendarView).render())
	}

	async loadSettings() {
		this.settings = new Settings((await this.loadData()) as Settings);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	get dailyNotesOptions() : {
		format: string,
		folder: string,
		template: string
	} {
		const dailyNotesPlugin = this.app.internalPlugins.getPluginById('daily-notes');
		if (!dailyNotesPlugin || !dailyNotesPlugin.enabled) {
			new Obsidian.Notice(t('dailyNotesPluginNotEnabled'));
			throw new Error(t('dailyNotesPluginNotEnabled'));
		}

		return Object.assign({
			format: 'YYYY-MM-DD',
			folder: '',
			template: ''
		}, dailyNotesPlugin.instance.options);
	}
}
