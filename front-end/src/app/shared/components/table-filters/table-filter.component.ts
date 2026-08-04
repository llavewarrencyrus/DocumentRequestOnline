import { Component, computed, effect, input, output, OnInit, signal, ViewChildren, QueryList, model } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { SelectModule } from 'primeng/select';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { ButtonModule } from 'primeng/button';
import { InputMaskModule } from 'primeng/inputmask';
import { PopoverModule } from 'primeng/popover';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { Popover } from 'primeng/popover';
import { FloatLabelModule } from 'primeng/floatlabel';
import { MessageService } from 'primeng/api';
import { Tooltip } from "primeng/tooltip";

export interface SearchInput {
  query?: string;
  placeholder: string;
}

export interface SelectInput {
  id: string;
  options: FilterOption[];
  filter: boolean;
  selected: FilterOption;
  icon?: string;
}

export interface FilterOption {
  label: string;
  value: string | 'all';
}

export interface DateItem {
  id: string;
  label: string;
  value: [string | null, string | null];
}


@Component({
  selector: 'app-table-filters',
  standalone: true,
  imports: [
    FormsModule,
    SelectModule,
    InputGroupAddonModule,
    InputGroupModule,
    ButtonModule,
    InputTextModule,
    InputMaskModule,
    PopoverModule,
    DatePickerModule,
    FloatLabelModule,
    Tooltip
  ],
  templateUrl: './table-filter.component.html',
})
export class TableFilterComponent {
  @ViewChildren('datePopover') datePopovers!: QueryList<Popover>;
  @ViewChildren('datePopoverTo') datePopoverTos!: QueryList<Popover>;
  @ViewChildren('dateMask') dateMasks!: QueryList<any>;

  search = model<SearchInput>();
  select = model<SelectInput[]>([]);
  date = model<DateItem[]>([]);

  dateFrom: [Date | null] = [null];
  dateRange: [[Date | null, Date | null] | null] = [[null, null]];
  showTo: boolean = false;

  onSearch = output<string>();
  onSelectItem = output<{ index: number, value: string; }>();
  onDateChange = output<{ index: number, value: [Date | null, Date | null]; }>();

  onFilter = output();

  searchInput: string = '';
  private selectedItems = signal<Record<number, FilterOption>>({});

  constructor(private messageService: MessageService) {
    effect(() => {
      if (this.search() && this.search()?.query) {
        this.search()!.query = '';
      }
      if (this.date().length > 0) {
        this.date().forEach((date) => {
          if (!date.value) {
            date.value = [null, null];
          }
        });
      }
      if (this.select().length > 0) {
        this.select().forEach((select) => {
          if (!select.selected) {
            select.selected = select.options[0];
          }
        });
      }
    });
  }

  onSearchSubmit() {
    this.onFilter.emit();
  }

  onSearchEnter(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.onSearchSubmit();
    }
  }

  onItemChange(index: number) {
    this.onFilter.emit();
  }

  // ========== Date Method =============

  onDateFromStringComplete(index: number) {
    const [year, month, day] = String(this.date()[index].value[0]).split('-').map(Number);
    this.dateFrom[index] = new Date(year, month - 1, day);
    this.dateRange[index] = [this.dateFrom[index], this.dateRange[index]![1]];

    if (this.showTo && this.dateRange[index]![0] && this.dateRange[index]![1]) {
      if (this.dateRange[index]![0] > this.dateRange[index]![1]) {
        this.messageService.add({ severity: 'error', summary: 'Invalid Date Range', detail: 'Start date cannot be after end date' });
        return;
      }
    }

    if (!this.showTo) {
      this.onFilter.emit();
    }
  }

  onDateFromStringSelect(index: number) {
    this.date()[index].value[0] = this.dateFrom[index]?.toLocaleDateString('en-CA') || null;
    this.dateRange[index] = [this.dateFrom[index], this.dateRange[index]![1]];

    if (this.showTo && this.dateRange[index]![0] && this.dateRange[index]![1]) {
      if (this.dateRange[index]![0] > this.dateRange[index]![1]) {
        this.messageService.add({ severity: 'error', summary: 'Invalid Date Range', detail: 'Start date cannot be after end date' });
        return;
      }
    }

    if (!this.showTo) {
      this.onFilter.emit();
    }
  }

  onDateRangeSelect(index: number) {
    this.date()[index].value = [this.dateRange[index]![0]?.toLocaleDateString('en-CA') || null, this.dateRange[index]![1]?.toLocaleDateString('en-CA') || null];

    if (this.date()[index].value[0] && this.date()[index].value[1]) {
      if (this.showTo && this.dateRange[index]![0] && this.dateRange[index]![1]) {
        if (this.dateRange[index]![0] > this.dateRange[index]![1]) {
          this.messageService.add({ severity: 'error', summary: 'Invalid Date Range', detail: 'Start date cannot be after end date' });
          return;
        }
      }
      this.onFilter.emit();
    }
  }

  onDateToStringComplete(index: number) {
    const [year, month, day] = String(this.date()[index].value[1]).split('-').map(Number);
    this.dateRange[index] = [this.dateRange[index]![0], new Date(year, month - 1, day)];

    if (this.date()[index].value[0] && this.date()[index].value[1]) {
      if (this.showTo && this.dateRange[index]![0] && this.dateRange[index]![1]) {
        if (this.dateRange[index]![0] > this.dateRange[index]![1]) {
          this.messageService.add({ severity: 'error', summary: 'Invalid Date Range', detail: 'Start date cannot be after end date' });
          return;
        }
      }
      this.onFilter.emit();
    }
  }

  //============ Clear Methods ============

  clearDateFilter(index: number) {
    this.dateFrom[index] = null;
    this.showTo = false;
    this.dateRange[index] = [null, null];
    this.date()[index].value = [null, null];
    this.onFilter.emit();
  }

  clearAllFilters() {
    this.search()!.query = '';
    this.showTo = false;
    this.dateFrom = [null];
    this.dateRange.forEach((range) => {
      range = [null, null];
    });
    this.date().forEach((range) => {
      range.value = [null, null];
    });
    this.select().forEach((items) => {
      items.selected = items.options[0];
    });

    this.onFilter.emit();
  }

  hasAnyFilter(): boolean {
    return !!(
      (this.search()!.query?.trim() && this.search()!.query?.trim() !== '') ||
      (this.select().some(item => item.selected.value !== 'all') && this.select().some(item => item.selected !== item.options[0])) ||
      this.date().some(date => (date.value[0] !== null && date.value[0] !== '') || (date.value[1] !== null && date.value[1] !== ''))
    );
  }

  //============ Helper Methods ============

  toggleDateRange() {
    this.showTo = !this.showTo;
  }

  focusOnDateMask(event: any, index: number) {
    const mask = this.dateMasks.toArray()[index];
    if (mask) {
      mask.nativeElement.focus();
    }
  }

  showDatePopover(event: Event, index: number) {
    const popover = this.datePopovers.toArray()[index];
    if (popover) {
      popover.show(event);
    }
  }

  showDatePopoverTo(event: Event, index: number) {
    const popover = this.datePopoverTos.toArray()[index];
    if (popover) {
      popover.show(event);
    }
  }
}
