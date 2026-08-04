import { Component, OnInit, ViewChild, ElementRef, HostListener, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { RequestService, DocumentOption, Course, CreateDocumentRequest } from '@features/document-request/request.service';
import { CreateDocumentRequest as StudentCreateDocumentRequest } from '@features/document-request/student-request.model';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { Subject, finalize, forkJoin } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { StudentRequestService } from '@features/document-request/student-request.service';

@Component({
  selector: 'app-document-request-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ButtonModule,
    IconFieldModule,
    InputIconModule
  ],
  templateUrl: './document-request-form.page.html'
})
export class DocumentRequestFormPage implements OnInit, OnDestroy {
  @ViewChild('requestForm') requestForm!: NgForm;
  @ViewChild('documentInput') documentInput!: ElementRef;
  @ViewChild('purposeInput') purposeInput!: ElementRef;
  @ViewChild('courseInput') courseInput!: ElementRef;
  @ViewChild('documentDropdown') documentDropdown!: ElementRef;
  @ViewChild('purposeDropdown') purposeDropdown!: ElementRef;
  @ViewChild('courseDropdown') courseDropdown!: ElementRef;

  studentInfo = {
    studentId: '',
    lastName: '',
    firstName: '',
    middleName: '',
    requestorId: '',
    requestorCourseId: null as number | null,
    email: '',
    phone: '',
    year: null as number | null,
  };

  // Form fields
  selectedDocuments: DocumentOption[] = [];
  selectedDocumentIds: Set<number> = new Set();
  quantity: number = 1;
  selectedPurposesList: string[] = [];
  selectedPurposesSet: Set<string> = new Set();
  purpose: string = '';
  estimatedClaimDate: string = '';
  calculatedPrice: number = 0;
  year: number = 1;

  // Contact information
  contactNoPrefix: string = '+63';
  contactNoInput: string = '';
  contactNo: string = '';
  emailAddress: string = '';

  //category
  requestCategory: string = 'REGULAR';
  needsClearance: boolean = false;
  categoryOptions = [
    { label: 'Regular Request', value: 'REGULAR', icon: 'pi pi-file' },
    { label: 'Newly Graduate', value: 'NEWLY_GRADUATE', icon: 'pi pi-graduation-cap' },
    { label: 'Transfer to another School', value: 'TRANSFER', icon: 'pi pi-external-link' }
  ];

  // Holidays
  holidays: Set<string> = new Set();
  holidaysLoaded: boolean = false;
  private holidayLoadAttempted: boolean = false;

  // Reference data from API
  courseOptions: Course[] = [];
  selectedCourseId: number | null = null;
  filteredCourseOptions: Course[] = [];
  courseSearchTerm: string = '';
  showCourseDropdown: boolean = false;
  courseInputFocused: boolean = false;

  purposeOptions: string[] = [
    'For Employment',
    'For Further Studies',
    'For Board Examination',
    'For Promotion',
    'For Transfer',
    'For Personal Records',
    'For Government Requirement',
    'For Abroad',
    'Others'
  ];

  documentOptions: DocumentOption[] = [];

  // Search functionality
  documentSearchTerm: string = '';
  filteredDocuments: DocumentOption[] = [];
  purposeSearchTerm: string = '';
  filteredPurposes: string[] = [];

  // UI state
  documentInputFocused: boolean = false;
  purposeInputFocused: boolean = false;
  showDocumentDropdown: boolean = false;
  showPurposeDropdown: boolean = false;
  isSubmitting: boolean = false;
  loading: boolean = false;

  // First copy document IDs (Diploma, OTR, SF10)
  private firstCopyDocumentIds = [2, 3, 4]; // OTR (2), Diploma (3), Form 137/SF10 (4)
  private cavDocumentId = 7; // CAV ID is 7

  // Cleanup subject
  private destroy$ = new Subject<void>();
  private courseSelectionInProgress: boolean = false;

  private studentRequestService = inject(StudentRequestService);
  private authService = inject(AuthService);
  private requestService = inject(RequestService);
  private router = inject(Router);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  ngOnInit(): void {
    this.loadInitialData();
    this.loadUserInfo();
    this.updateEstimatedClaimDate();

    if (this.contactNo) {
      this.contactNoInput = this.contactNo.replace('+63', '');
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ========== INITIALIZATION METHODS ==========

  loadInitialData(): void {
    this.loading = true;

    forkJoin({
      documents: this.requestService.getDocumentOptions(),
      courses: this.requestService.getCourses()
    }).pipe(
      finalize(() => this.loading = false),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (result) => {
        this.documentOptions = result.documents;
        this.filteredDocuments = [...result.documents];

        this.courseOptions = result.courses;
        this.filteredCourseOptions = [...result.courses];

        if (this.selectedCourseId) {
          const selectedCourse = this.courseOptions.find(c => c.id === this.selectedCourseId);
          if (selectedCourse) {
            this.courseSearchTerm = this.toProperCase(selectedCourse.description);
          }
        }
      },
      error: (error) => {
        console.error('Error loading reference data:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load required data. Please refresh the page.',
          life: 3000
        });
      }
    });
  }

  loadUserInfo(): void {
    const user = this.authService.getUserInfo();

    if (user) {
      this.studentInfo = {
        studentId: user.userId || '',
        lastName: user.lastName || '',
        firstName: user.firstName || '',
        middleName: user.middleName || '',
        requestorId: user.username || '',
        requestorCourseId: user.courseId || null,
        email: '',
        phone: '',
        year: user.years || null
      };

      this.selectedCourseId = user.courseId || null;
    }
  }

  // ========== CONTACT VALIDATION METHODS ==========

  validateContactNumber(): void {
    this.contactNoInput = this.contactNoInput.replace(/\D/g, '');

    if (this.contactNoInput.length > 10) {
      this.contactNoInput = this.contactNoInput.slice(0, 10);
    }

    this.contactNo = this.contactNoPrefix + this.contactNoInput;
  }

  isValidEmail(email: string): boolean {
    if (!email) return false;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }

  // ========== DATE METHODS ==========

  setDefaultClaimDate(): void {
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + 21);
    this.estimatedClaimDate = this.formatDate(futureDate);
  }

  formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  toProperCase(text: string): string {
    if (!text) return '';
    return text.toLowerCase().replace(/(?:^|\s)\S/g, char => char.toUpperCase());
  }

  getYearOrdinal(year: number): string {
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const v = year % 100;
    return year + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
  }

  loadHolidays(year: number): void {
    if (this.holidayLoadAttempted) return;
    this.holidayLoadAttempted = true;

    fetch(`https://date.nager.at/api/v3/publicholidays/${year}/PH`)
      .then(response => {
        if (!response.ok) throw new Error('Failed to fetch holidays');
        return response.json();
      })
      .then(data => {
        data.forEach((holiday: any) => {
          this.holidays.add(holiday.date);
        });
        this.holidaysLoaded = true;
        this.updateEstimatedClaimDate();
      })
      .catch(error => {
        console.error('Failed to load holidays:', error);
        this.holidaysLoaded = true;
      });
  }

  updateEstimatedClaimDate(): void {
    if (this.selectedDocuments.length === 0) {
      this.setDefaultClaimDate();
      return;
    }

    const today = new Date();
    let maxWorkingDays = 0;

    this.selectedDocuments.forEach(doc => {
      if (doc.processingPeriod > maxWorkingDays) {
        maxWorkingDays = doc.processingPeriod;
      }
    });

    const estimatedDate = this.addWorkingDays(today, maxWorkingDays);
    this.estimatedClaimDate = this.formatDate(estimatedDate);
  }

  private addWorkingDays(startDate: Date, workingDays: number): Date {
    if (workingDays === 0) return new Date(startDate);

    const result = new Date(startDate);
    let addedWorkingDays = 0;
    let currentYear = result.getFullYear();

    if (!this.holidaysLoaded) {
      this.loadHolidays(currentYear);
    }

    while (addedWorkingDays < workingDays) {
      result.setDate(result.getDate() + 1);

      if (result.getFullYear() > currentYear) {
        currentYear = result.getFullYear();
        this.loadHolidays(currentYear);
      }

      if (this.isWorkingDay(result)) {
        addedWorkingDays++;
      }
    }

    return result;
  }

  private isWorkingDay(date: Date): boolean {
    const day = date.getDay();

    if (day === 0 || day === 6) return false;

    if (this.holidaysLoaded) {
      const dateString = this.formatDate(date);
      if (this.holidays.has(dateString)) return false;
    }

    return true;
  }

  // ========== COURSE METHODS ==========

  filterCourses(): void {
    const searchTerm = this.courseSearchTerm.toLowerCase().trim();
    if (!searchTerm) {
      this.filteredCourseOptions = [...this.courseOptions];
    } else {
      this.filteredCourseOptions = this.courseOptions.filter(course =>
        course.description.toLowerCase().includes(searchTerm) ||
        course.code.toLowerCase().includes(searchTerm) ||
        course.id.toString().includes(searchTerm)
      );
    }
    this.showCourseDropdown = true;
  }

  selectCourse(course: Course): void {
    this.courseSelectionInProgress = true;
    this.selectedCourseId = course.id;
    this.courseSearchTerm = this.toProperCase(course.description);
    this.showCourseDropdown = false;

    setTimeout(() => {
      this.courseSelectionInProgress = false;
    }, 200);
  }

  onCourseInputFocus(): void {
    this.courseInputFocused = true;
    this.showCourseDropdown = true;
    this.filterCourses();
  }

  onCourseInputBlur(): void {
    setTimeout(() => {
      if (!this.courseSelectionInProgress) {
        this.courseInputFocused = false;
        this.showCourseDropdown = false;
      }
    }, 200);
  }

  getCourseDisplayName(courseId: number | null | undefined): string {
    if (!courseId) return '';
    const course = this.courseOptions.find(c => c.id === courseId);
    return course?.description || courseId.toString();
  }

  getCourseCode(courseId: number | null | undefined): string {
    if (!courseId) return '';
    const course = this.courseOptions.find(c => c.id === courseId);
    return course?.code || '';
  }

  // ========== CATEGORY METHODS ==========

  onCategoryChange(category: string): void {
    this.requestCategory = category;

    // Automatically trigger clearance for Graduate and Transfer paths
    if (category === 'NEWLY_GRADUATE' || category === 'TRANSFER') {
      this.needsClearance = true;
    } else {
      this.needsClearance = false;
    }
  }

  // ========== DOCUMENT METHODS ==========

  isFirstCopyDocument(doc: DocumentOption): boolean {
    return this.firstCopyDocumentIds.includes(doc.id);
  }

  isCAVDocument(doc: DocumentOption): boolean {
    return doc.id === this.cavDocumentId;
  }

  hasFirstCopyDocument(): boolean {
    return this.selectedDocuments.some(doc => this.isFirstCopyDocument(doc));
  }

  hasCAVDocument(): boolean {
    return this.selectedDocuments.some(doc => this.isCAVDocument(doc));
  }

  getFirstCopyDocuments(): DocumentOption[] {
    return this.selectedDocuments.filter(doc => this.isFirstCopyDocument(doc));
  }

  getNonFirstCopyDocuments(): DocumentOption[] {
    return this.selectedDocuments.filter(doc => !this.isFirstCopyDocument(doc));
  }

  getDocumentFeeNote(doc: DocumentOption): string {
    if (!doc) return '';

    if (this.isFirstCopyDocument(doc)) {
      if (doc.id === 2 || doc.id === 3) { // OTR
        return `First copy free. Succeeding copies: ₱${doc.fee} each`;
      } else if (doc.id === 4) { // SF10
        return 'First copy free. Succeeding copies: ₱100-200 each (varies by level)';
      }
    } else if (this.isCAVDocument(doc)) {
      return 'Base rate: ₱150.00. Final fee may range from ₱150.00 to ₱275.00 depending on program (e.g., BSN) and destination (e.g., Qatar). Final assessment by ARC.';
    }
    return '';
  }

  getSucceedingCopyFee(doc: DocumentOption): number {
    if (!doc) return 0;
    return doc.fee;
  }

  calculateDocumentTotal(doc: DocumentOption, quantity: number): number {
    if (!doc) return 0;

    const qty = quantity || 1;

    if (!this.isFirstCopyDocument(doc)) {
      return doc.fee * qty;
    } else {
      if (qty <= 1) {
        return 0;
      } else {
        return doc.fee * (qty - 1);
      }
    }
  }

  filterDocuments(): void {
    const searchTerm = this.documentSearchTerm.toLowerCase();
    if (!searchTerm) {
      this.filteredDocuments = this.documentOptions.filter(doc =>
        !this.selectedDocumentIds.has(doc.id)
      );
    } else {
      this.filteredDocuments = this.documentOptions.filter(doc =>
        !this.selectedDocumentIds.has(doc.id) && (
          doc.name.toLowerCase().includes(searchTerm) ||
          doc.description?.toLowerCase().includes(searchTerm) ||
          doc.category.toLowerCase().includes(searchTerm) ||
          doc.processingPeriod.toString().includes(searchTerm)
        )
      );
    }
  }

  toggleDocumentSelection(document: DocumentOption): void {
    if (this.selectedDocumentIds.has(document.id)) {
      this.selectedDocumentIds.delete(document.id);
      this.selectedDocuments = this.selectedDocuments.filter(d => d.id !== document.id);
    } else {
      this.selectedDocumentIds.add(document.id);
      this.selectedDocuments.push(document);
    }
    this.documentSearchTerm = '';
    this.filterDocuments();
    this.calculateTotalPrice();
    this.updateEstimatedClaimDate();
  }

  isDocumentSelected(document: DocumentOption): boolean {
    return this.selectedDocumentIds.has(document.id);
  }

  addDocumentFromSearch(document: DocumentOption): void {
    if (!this.isDocumentSelected(document)) {
      this.toggleDocumentSelection(document);
      this.showDocumentDropdown = false;
      setTimeout(() => {
        this.documentInput?.nativeElement?.focus();
      }, 10);
    }
  }

  removeDocument(index: number, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    const document = this.selectedDocuments[index];
    this.selectedDocumentIds.delete(document.id);
    this.selectedDocuments.splice(index, 1);
    this.filterDocuments();
    this.calculateTotalPrice();
    this.updateEstimatedClaimDate();
    setTimeout(() => {
      this.documentInput?.nativeElement?.focus();
    }, 10);
  }

  onDocumentKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Backspace' && this.documentSearchTerm === '' && this.selectedDocuments.length > 0) {
      this.removeDocument(this.selectedDocuments.length - 1);
    }
  }

  onDocumentInputClick(): void {
    this.showDocumentDropdown = true;
    this.documentInputFocused = true;
    this.filterDocuments();
  }

  onDocumentInputFocus(): void {
    this.documentInputFocused = true;
    this.showDocumentDropdown = true;
    this.filterDocuments();
  }

  onDocumentInputBlur(): void {
    setTimeout(() => {
      this.documentInputFocused = false;
    }, 200);
  }

  // ========== PURPOSE METHODS ==========

  filterPurposes(): void {
    const searchTerm = this.purposeSearchTerm.toLowerCase();
    if (!searchTerm) {
      this.filteredPurposes = this.purposeOptions.filter(purpose =>
        !this.selectedPurposesSet.has(purpose)
      );
    } else {
      this.filteredPurposes = this.purposeOptions.filter(purpose =>
        !this.selectedPurposesSet.has(purpose) &&
        purpose.toLowerCase().includes(searchTerm)
      );

      if (searchTerm && !this.filteredPurposes.some(p => p.toLowerCase() === searchTerm)) {
        this.filteredPurposes.push(`Add custom: "${searchTerm}"`);
      }
    }
    this.showPurposeDropdown = true;
  }

  togglePurposeSelection(purpose: string): void {
    if (purpose.startsWith('Add custom: ')) {
      const customPurpose = purpose.replace('Add custom: "', '').replace('"', '');
      if (!this.selectedPurposesSet.has(customPurpose)) {
        this.selectedPurposesSet.add(customPurpose);
        this.selectedPurposesList.push(customPurpose);
      }
    } else {
      if (this.selectedPurposesSet.has(purpose)) {
        this.selectedPurposesSet.delete(purpose);
        this.selectedPurposesList = this.selectedPurposesList.filter(p => p !== purpose);
      } else {
        this.selectedPurposesSet.add(purpose);
        this.selectedPurposesList.push(purpose);
      }
    }

    this.updatePurposeString();
    this.purposeSearchTerm = '';
    this.filterPurposes();
  }

  isPurposeSelected(purpose: string): boolean {
    return this.selectedPurposesSet.has(purpose);
  }

  addPurposeFromDropdown(purposeText: string): void {
    if (purposeText.startsWith('Add custom: ')) {
      const customPurpose = purposeText.replace('Add custom: "', '').replace('"', '');
      if (!this.isPurposeSelected(customPurpose)) {
        this.togglePurposeSelection(customPurpose);
        this.showPurposeDropdown = false;
        setTimeout(() => {
          this.purposeInput?.nativeElement?.focus();
        }, 10);
      }
    } else {
      if (!this.isPurposeSelected(purposeText)) {
        this.togglePurposeSelection(purposeText);
        this.showPurposeDropdown = false;
        setTimeout(() => {
          this.purposeInput?.nativeElement?.focus();
        }, 10);
      }
    }
  }

  removePurpose(index: number, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    const purpose = this.selectedPurposesList[index];
    this.selectedPurposesSet.delete(purpose);
    this.selectedPurposesList.splice(index, 1);
    this.updatePurposeString();
    this.filterPurposes();
    setTimeout(() => {
      this.purposeInput?.nativeElement?.focus();
    }, 10);
  }

  updatePurposeString(): void {
    this.purpose = this.selectedPurposesList.join(', ');
  }

  onPurposeKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Backspace' && this.purposeSearchTerm === '' && this.selectedPurposesList.length > 0) {
      this.removePurpose(this.selectedPurposesList.length - 1);
    }
    if (event.key === 'Enter' && this.purposeSearchTerm.trim()) {
      event.preventDefault();
      const newPurpose = this.purposeSearchTerm.trim();
      if (!this.isPurposeSelected(newPurpose)) {
        this.togglePurposeSelection(newPurpose);
      }
    }
  }

  onPurposeInputClick(): void {
    this.showPurposeDropdown = true;
    this.purposeInputFocused = true;
    this.filterPurposes();
  }

  onPurposeInputFocus(): void {
    this.purposeInputFocused = true;
    this.showPurposeDropdown = true;
    this.filterPurposes();
  }

  onPurposeInputBlur(): void {
    setTimeout(() => {
      this.purposeInputFocused = false;
    }, 200);
  }

  // ========== PRICE CALCULATION METHODS ==========

  calculateTotalPrice(): void {
    this.calculatedPrice = this.selectedDocuments.reduce((total, doc) => {
      return total + this.calculateDocumentTotal(doc, this.quantity);
    }, 0);
  }

  onQuantityChange(): void {
    this.calculateTotalPrice();
  }

  // ========== FORM SUBMISSION METHODS ==========

  submitRequest(): void {
    if (this.selectedDocuments.length === 0) {
      this.showError('Please select at least one document type.');
      return;
    }

    if (this.selectedPurposesList.length === 0) {
      this.showError('Please select at least one purpose for your request.');
      return;
    }

    if (!this.contactNoInput.trim() || this.contactNoInput.length < 10) {
      this.showError('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (!this.emailAddress.trim() || !this.isValidEmail(this.emailAddress)) {
      this.showError('Please enter a valid email address.');
      return;
    }

    if (!this.selectedCourseId) {
      this.showError('Please select your program/course.');
      return;
    }

    this.isSubmitting = true;

    const requestData: StudentCreateDocumentRequest = {
      studentId: this.studentInfo.studentId,
      requestorId: this.studentInfo.requestorId,
      requestorLastName: this.studentInfo.lastName,
      requestorFirstName: this.studentInfo.firstName,
      requestorMiddleName: this.studentInfo.middleName || undefined,
      requestorCourseId: this.selectedCourseId,
      email: this.emailAddress,
      contact: this.contactNo,
      requestCategory: this.requestCategory,
      needsClearance: this.needsClearance,
      documents: this.selectedDocuments.map(doc => ({ id: doc.id, name: doc.name })),
      quantity: this.quantity,
      purpose: this.purpose,
      estimatedClaimDate: this.estimatedClaimDate,
      price: this.calculatedPrice,
      year: this.studentInfo.year ?? 1,
    };

    this.studentRequestService.create(requestData)
      .pipe(
        finalize(() => this.isSubmitting = false),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (newRequest) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Request Submitted Successfully',
            detail: `Your request #${newRequest.id} has been submitted. Total Fee: ₱${this.calculatedPrice.toFixed(2)}`,
            life: 2000
          });

          setTimeout(() => {
            this.router.navigate(['/student/dashboard']);
          });
        },
        error: (error) => {
          console.error('Submission error:', error);
          this.showError('Failed to submit request. Please try again.');
        }
      });
  }

  cancel(): void {
    this.confirmationService.confirm({
      message: 'Are you sure you want to cancel? All entered data will be lost.',
      header: 'Cancel Request',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.messageService.add({
          severity: 'info',
          summary: 'Cancelled',
          detail: 'Returning to dashboard...',
          life: 2000
        });
        setTimeout(() => {
          this.router.navigate(['/student/dashboard']);
        }, 1000);
      }
    });
  }

  isFormValid(): boolean {
    return this.selectedDocuments.length > 0 &&
      this.selectedPurposesList.length > 0 &&
      !!this.contactNoInput.trim() &&
      this.contactNoInput.length === 10 &&
      !!this.emailAddress.trim() &&
      this.isValidEmail(this.emailAddress) &&
      !!this.selectedCourseId &&
      this.year >= 1 &&
      this.year <= 5 &&
      !this.isSubmitting &&
      !this.loading;
  }

  // ========== HELPER METHODS ==========

  private showError(message: string): void {
    this.messageService.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: message,
      life: 3000
    });
  }

  private showSuccess(summary: string, detail: string): void {
    this.messageService.add({
      severity: 'success',
      summary: summary,
      detail: detail,
      life: 4000
    });
  }

  @HostListener('document:click', ['$event'])
  handleClickOutside(event: Event): void {
    if (this.documentDropdown?.nativeElement &&
      !this.documentDropdown.nativeElement.contains(event.target) &&
      this.documentInput?.nativeElement &&
      !this.documentInput.nativeElement.contains(event.target)) {
      this.showDocumentDropdown = false;
    }

    if (this.purposeDropdown?.nativeElement &&
      !this.purposeDropdown.nativeElement.contains(event.target) &&
      this.purposeInput?.nativeElement &&
      !this.purposeInput.nativeElement.contains(event.target)) {
      this.showPurposeDropdown = false;
    }

    if (this.courseDropdown?.nativeElement &&
      !this.courseDropdown.nativeElement.contains(event.target) &&
      this.courseInput?.nativeElement &&
      !this.courseInput.nativeElement.contains(event.target)) {
      this.showCourseDropdown = false;
    }
  }

  // Helper getters
  get hasSelectedPurposes(): boolean {
    return this.selectedPurposesList.length > 0;
  }

  get selectedPurposesCount(): number {
    return this.selectedPurposesList.length;
  }
}