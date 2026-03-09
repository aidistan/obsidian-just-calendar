import Obsidian, { moment } from 'obsidian';
import CalendarJS from '@calendarjs/ce';
import Plugin from './main';
import { Settings } from './settings';
import { LOCALES, translate as t } from './constants';

export default class CalendarView extends Obsidian.ItemView {
	public static readonly VIEW_TYPE = 'calendar-view';

	private static readonly DICTIONARY_KEYS = {
		'January': 'january',
		'February': 'february',
		'March': 'march',
		'April': 'april',
		'May': 'may',
		'June': 'june',
		'July': 'july',
		'August': 'august',
		'September': 'september',
		'October': 'october',
		'November': 'november',
		'December': 'december',
		'Sunday': 'sun',
		'Monday': 'mon',
		'Tuesday': 'tue',
		'Wednesday': 'wed',
		'Thursday': 'thu',
		'Friday': 'fri',
		'Saturday': 'sat',
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
		this.render();
	}

	async onClose() {
	}

	render() {
		const container = this.contentEl;
		container.empty();

		this.calendar = CalendarJS.Calendar(container, {
			type: 'inline',
			footer: false,
			startingDay: parseInt(this.plugin.settings.weekStartingOnWithLocaleDefault()),
			onchange: (_: object, value: string) => {
				const date = moment(value);
				const isCtrlPressed = (window.event as MouseEvent | KeyboardEvent)?.ctrlKey
				date.isValid() && this.openDailyNote(date, isCtrlPressed);
			}
		});

		const todayBtn = container.querySelector('.lm-calendar-navigation')?.createEl('button', {
			text: 'today',
			cls: ['lm-calendar-icon', 'lm-ripple'],
			attr: {
				type: 'button',
				tabindex: '0'
			}
		});

		todayBtn?.addEventListener('click', (e: MouseEvent) => this.calendar.setValue?.(moment().format('YYYY-MM-DD')));
		todayBtn?.click();
	}

	public updateDate(date: moment.Moment) {
		if (this.calendar && date.isValid()) {
			this.calendar.setValue?.(date.format('YYYY-MM-DD'));
		}
	}

	private async openDailyNote(date: moment.Moment, isCtrlPressed: boolean) {
		const { app } = this;
		const options = this.plugin.dailyNotesOptions;
		const fileName = date.format(options.format);
		const filePath = `${options.folder}/${fileName}.md`.replace(/^\//, "");
		let file = this.app.vault.getAbstractFileByPath(filePath);

		if (!file) {
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
					const templateFile = app.vault.getAbstractFileByPath(options.template);
					if (templateFile instanceof Obsidian.TFile) {
						content = (await app.vault.read(templateFile))
							.replace(/{{\s*date\s*}}/gi, fileName)
							.replace(/{{\s*time\s*}}/gi, moment().format("HH:mm"))
							.replace(/{{\s*title\s*}}/gi, fileName)
							.replace(/{{\s*(date|time)\s*(([+-]\d+)([yqmwdhs]))?\s*(:.+?)?}}/gi, (_, _timeOrDate, calc, timeDelta, unit, momentFormat) => {
								const now = moment();
								const currentDate = date.clone().set({
									hour: now.get("hour"),
									minute: now.get("minute"),
									second: now.get("second"),
								});
								if (calc) {
									currentDate.add(parseInt(timeDelta, 10), unit);
								}
								if (momentFormat) {
									return currentDate.format(momentFormat.substring(1).trim());
								}
								return currentDate.format(options.format);
							})
							.replace(/{{\s*yesterday\s*}}/gi, date.clone().subtract(1, "day").format(options.format))
							.replace(/{{\s*tomorrow\s*}}/gi, date.clone().add(1, "d").format(options.format));
					}
				}

				// Ensure folder exists
				if (options.folder && !(app.vault.getAbstractFileByPath(options.folder))) {
					await app.vault.createFolder(options.folder);
				}

				file = await app.vault.create(filePath, content);
			} catch (err) {
				new Obsidian.Notice(t('failedToCreateDailyNote'));
				return;
			}
		}

		if (file instanceof Obsidian.TFile) {
			await this.app.workspace.getLeaf(isCtrlPressed).openFile(file);
		}
	}
}
