import { Component, input, output, OnInit, inject, ViewChild, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { PasswordModule } from 'primeng/password';
import { CheckboxModule } from 'primeng/checkbox';
import { DividerModule } from 'primeng/divider';
import { MessageModule } from 'primeng/message';

import { AccountService } from '@account/account.service';
import { User, CreateUserDto, UpdateUserDto } from '@account/account.model';
import { map } from 'rxjs';

@Component({
  selector: 'user-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    PasswordModule,
    CheckboxModule,
    DividerModule,
    MessageModule,
  ],
  templateUrl: './user-form.component.html',
})
export class UserFormComponent implements OnInit {
  private userService = inject(AccountService);

  @ViewChild('userForm') userForm!: NgForm;

  mode = input<'create' | 'edit'>('create');
  user = input<User | null>(null);
  cancel = input<() => void>();
  onFormStateChange = input<(disabled: boolean, userDate: CreateUserDto | UpdateUserDto) => void>();

  formData: any = {
    username: '',
    role: null,
    office: null,
    departmentId: 24,
    isActive: true,
  };

  initialFormData: any = {};

  roleOptions = [
    { value: 'ADMIN', label: 'Administrator' },
    { value: 'Cashier', label: 'Cashier' },
    { value: 'Librarian', label: 'Librarian' },
    { value: 'Director', label: 'School Dean/Principal' },
    { value: 'Accountant', label: 'Accountant' },
    { value: 'Inventory', label: 'Inventory' },
    { value: 'Counselor', label: 'Counselor' },
  ];
  officeOptions = [
    { value: 'CASHIER', label: 'Cashier Office' },
    { value: 'LIBRARY', label: 'Library' },
    { value: 'SCHOOL', label: 'School Director' },
    { value: 'ACCOUNTS', label: 'Accounting Office' },
    { value: 'INVENTORY', label: 'Inventory Office' },
    { value: 'CCSD', label: 'Counseling Center' },
  ];
  showUsernameError: boolean = false;

  departmentOptions: Array<{ label: string; value: number; }> = [];

  constructor() {
    effect(() => {
      const callback = this.onFormStateChange();
      if (callback) {
        callback(this.shouldDisableSave, this.submitData);
      }
    });
  }

  ngOnInit() {
    this.userService.getDepartments().pipe(
      map(response => {
        return response.map(dept => ({
          label: this.toCamelCase(dept.description),
          value: dept.id
        }));
      })
    ).subscribe(options => {
      this.departmentOptions = options;
    });

    if (this.mode() === 'edit' && this.user()) {
      this.populateForm();
    }
  }

  populateForm() {
    const user = this.user();
    if (user) {
      this.formData = {
        username: user.username.toLocaleLowerCase(),
        role: this.roleOptions.find(r => r.value === user.role) || null,
        office: this.officeOptions.find(o => o.value === user.office) || null,
        departmentId: user.departmentId,
        isActive: user.isActive,
      };
      // Store initial state for change detection
      this.initialFormData = { ...this.formData };
    }
    console.log('username: ', this.formData.username);
  }

  autoGenerateOffice(roleValue: string) {
    const officeMapping: Record<string, string> = {
      'Admin': 'ADMIN',
      'Cashier': 'CASHIER',
      'Librarian': 'LIBRARY',
      'Director': 'SCHOOL',
      'Accountant': 'ACCOUNTS',
      'Inventory': 'INVENTORY',
      'Counselor': 'CCSD',
    };

    const officeValue = officeMapping[roleValue];
    if (officeValue) {
      const office = this.officeOptions.find(o => o.value === officeValue);
      this.formData.office = office || null;
    } else {
      this.formData.office = null;
    }
  }

  onRoleChange() {
    if (this.formData.role) {
      this.autoGenerateOffice(this.formData.role.value);
    }
  }

  validateForm(): boolean {
    this.showUsernameError = false;

    if (this.mode() === 'create') {
      if (!this.formData.username || this.formData.username.length < 3) {
        this.showUsernameError = true;
        return false;
      }
    }

    if (!this.formData.role) {
      return false;
    }

    return true;
  }

  onCancel() {
    const callback = this.cancel();
    if (callback) {
      callback();
    }
  }

  toCamelCase(str: string): string {
    return str
      .toLowerCase()
      .replace(/(?:^|\s)\w/g, match => match.toUpperCase());
  }

  get submitData(): any {
    return {
      username: this.formData.username.value?.toLocaleLowerCase(),
      role: this.formData.role?.value,
      office: this.formData.office?.value,
      departmentId: this.formData.office?.value !== 'SCHOOL' ? 24 : this.formData.departmentId,
      isActive: this.formData.isActive,
    };
  };

  get isFormInvalid(): boolean {
    if (this.formData.role?.value === 'Director') {
      let isInvalid: boolean = false;
      if (this.formData.departmentId === 24 || this.formData.departmentId === 23) {
        isInvalid = true;
      }
      return isInvalid;
    }
    return this.userForm?.invalid ?? false;
  }

  get hasChanges(): boolean {
    if (this.mode() === 'create') return true;
    return JSON.stringify(this.formData) !== JSON.stringify(this.initialFormData);
  }

  get shouldDisableSave(): boolean {
    if (this.mode() === 'create') {
      return this.isFormInvalid;
    } else {
      return !this.hasChanges || this.isFormInvalid;
    }
  }
}