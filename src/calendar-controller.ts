import Obsidian, { moment } from 'obsidian';
import { Controller } from '@hotwired/stimulus';
import CalendarView from 'calendar-view';
import { LOCALES } from './constants';

const DATE_FORMAT = 'YYYY-MM-DD';

export default class CalendarController extends Controller {
  static targets = ['month', 'year', 'container', 'weekdays', 'contents'];
  declare readonly monthTarget: HTMLElement;
  declare readonly yearTarget: HTMLElement;
  declare readonly containerTarget: HTMLElement;
  declare readonly weekdaysTarget: HTMLElement;
  declare readonly contentsTarget: HTMLElement;

  static values = {
    locale: { type: String, default: 'en' },
    startingOn: { type: Number, default: 0 },
    selectedDate: { type: String, default: '' },
    viewingDate: { type: String, default: moment().format(DATE_FORMAT) },
    viewType: { type: String, default: 'days' },
  };
  declare localeValue: keyof typeof LOCALES;
  declare startingOnValue: number;
  declare selectedDateValue: string;
  declare viewingDateValue: string;
  declare viewTypeValue: 'days' | 'months' | 'years';

  public parentView: CalendarView | undefined;

  connect() {
    // Use built-in icons
    Obsidian.setIcon(this.element.querySelector('[data-action="calendar#prev"]') as HTMLElement, 'chevron-up');
    Obsidian.setIcon(this.element.querySelector('[data-action="calendar#next"]') as HTMLElement, 'chevron-down');
    Obsidian.setIcon(this.element.querySelector('[data-action="calendar#today"]') as HTMLElement, 'calendar-x');

    this.render();
  }

  selectedDateValueChanged() {
    if (moment(this.selectedDateValue).isValid()) {
      this.viewingDateValue = this.selectedDateValue;
    }
    this.render();
  }

  viewingDateValueChanged() {
    this.render();
  }

  viewTypeValueChanged() {
    this.containerTarget.dataset.view = this.viewTypeValue;
    this.render();
  }

  scroll(event: WheelEvent) {
    if (event.deltaY > 0) {
      this.next();
    } else {
      this.prev();
    }
  }

  prev() {
    const v = { days: [1, 'month'], months: [1, 'year'], years: [16, 'years'] };
    this.viewingDateValue = this.viewingMoment.subtract(...v[this.viewTypeValue]).format(DATE_FORMAT);
  }

  next() {
    const v = { days: [1, 'month'], months: [1, 'year'], years: [16, 'years'] };
    this.viewingDateValue = this.viewingMoment.add(...v[this.viewTypeValue]).format(DATE_FORMAT);
  }

  today(event: MouseEvent | TouchEvent) {
    this.viewTypeValue = 'days';
    this.selectedDateValue = this.viewingDateValue = moment().format(DATE_FORMAT);
    void this.parentView?.openDailyNote(moment(), Obsidian.Keymap.isModifier(event, 'Mod'));
  }

  toggleView(event: Event) {
    const target = event.currentTarget as HTMLElement;
    if (target === this.monthTarget) {
      this.viewTypeValue = this.viewTypeValue === 'months' ? 'days' : 'months';
    } else if (target === this.yearTarget) {
      this.viewTypeValue = this.viewTypeValue === 'years' ? 'days' : 'years';
    }
  }

  selectDate(event: MouseEvent | TouchEvent) {
    const date = (event.currentTarget as HTMLElement).dataset.date;
    if (date) {
      this.selectedDateValue = date;
      void this.parentView?.openDailyNote(moment(date), Obsidian.Keymap.isModifier(event, 'Mod'));
    }
  }

  selectMonth(event: Event) {
    const month = (event.currentTarget as HTMLElement).dataset.month;
    if (month) {
      this.viewingDateValue = this.viewingMoment.month(month).format(DATE_FORMAT);
      this.viewTypeValue = 'days';
    }
  }

  selectYear(event: Event) {
    const year = (event.currentTarget as HTMLElement).dataset.year;
    if (year) {
      this.viewingDateValue = this.viewingMoment.year(parseInt(year)).format(DATE_FORMAT);
      this.viewTypeValue = 'months';
    }
  }

  private get viewingMoment() {
    return moment(this.viewingDateValue);
  }

  private get dict() {
    return LOCALES[this.localeValue] as Record<string, string | ((...args: string[]) => string)>;
  }

  public render() {
    // Render Header
    this.monthTarget.textContent = this.dict[this.viewingMoment.format('MMM').toLowerCase() + '.'] as string;
    this.yearTarget.textContent = this.viewingMoment.format('YYYY');

    switch (this.viewTypeValue) {
      case 'days':
        this.renderWeekdays();
        this.renderDays();
        break;
      case 'months':
        this.renderMonths();
        break;
      case 'years':
        this.renderYears();
        break;
    }
  }

  private renderWeekdays() {
    let keys = ['sun.', 'mon.', 'tue.', 'wed.', 'thu.', 'fri.', 'sat.'];
    keys = keys.slice(this.startingOnValue).concat(keys.slice(0, this.startingOnValue));

    this.weekdaysTarget.empty();
    for (const key of keys) {
      this.weekdaysTarget.createDiv().setText(this.dict[key] as string);
    }
  }

  private renderDays() {
    this.contentsTarget.empty();
    const startOfMonth = this.viewingMoment.startOf('month');
    const daysInMonth = this.viewingMoment.daysInMonth();

    // Previous month days
    const prevMonthDaysToShow = (startOfMonth.day() - this.startingOnValue + 7) % 7;
    const prevMonth = this.viewingMoment.subtract(1, 'month');
    const daysInPrevMonth = prevMonth.daysInMonth();
    for (let day = daysInPrevMonth - prevMonthDaysToShow + 1; day <= daysInPrevMonth; day++) {
      const dateStr = prevMonth.date(day).format(DATE_FORMAT);
      this.renderDayTile(this.contentsTarget, day, dateStr, true);
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = this.viewingMoment.date(day).format(DATE_FORMAT);
      this.renderDayTile(this.contentsTarget, day, dateStr, false);
    }

    // Next month days
    const totalDaysShownSoFar = prevMonthDaysToShow + daysInMonth;
    const nextMonthDaysToShow = (7 - (totalDaysShownSoFar % 7)) % 7;
    const nextMonth = this.viewingMoment.clone().add(1, 'month');
    for (let day = 1; day <= nextMonthDaysToShow; day++) {
      const dateStr = nextMonth.date(day).format(DATE_FORMAT);
      this.renderDayTile(this.contentsTarget, day, dateStr, true);
    }
  }

  private renderDayTile(parent: HTMLElement, day: number, dateStr: string, outside: boolean) {
    parent.createDiv({ text: day.toString() }, div => {
      div.dataset.date = dateStr;
      div.dataset.action = 'click->calendar#selectDate';

      if (outside) {
        div.classList.add('outside');
      } else {
        if (this.parentView?.checkDailyNote(moment(dateStr))) div.classList.add('exists');
        if (dateStr === moment().format(DATE_FORMAT)) div.classList.add('today');
        if (dateStr === this.selectedDateValue) div.classList.add('selected');
      }
    });
  }

  private renderMonths() {
    this.contentsTarget.empty();

    const keys = ['jan.', 'feb.', 'mar.', 'apr.', 'may.', 'jun.', 'jul.', 'aug.', 'sep.', 'oct.', 'nov.', 'dec.'];
    const currentMonth = this.viewingMoment.month();

    for (let i = 0; i < keys.length; i++) {
      this.contentsTarget.createDiv({ text: this.dict[keys[i] as string] as string }, div => {
        div.dataset.month = i.toString();
        div.dataset.action = 'click->calendar#selectMonth';

        if (i === currentMonth) div.classList.add('viewing');
      });
    }
  }

  private renderYears() {
    this.contentsTarget.empty();

    const currentYear = this.viewingMoment.year();
    const startYear = currentYear - currentYear % 16;

    for (let year = startYear; year < startYear + 16; year++) {
      this.contentsTarget.createDiv({ text: year.toString() }, div => {
        div.dataset.year = year.toString();
        div.dataset.action = 'click->calendar#selectYear';

        if (year === currentYear) div.classList.add('viewing');
      });
    }
  }
}
