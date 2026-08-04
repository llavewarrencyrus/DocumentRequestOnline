import { Component, input, inject, computed, signal, effect } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';

import { DocumentRequest } from '@features/document-request/request.model';
import { DocumentCard } from '@features/document-request/registrar-request.model';

import { RequestService } from '@features/document-request/request.service';
import { RegistrarRequestService } from '@features/document-request/registrar-request.service';
import { animate, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'app-edit-documents',
  standalone: true,
  imports: [
    ButtonModule,
    CheckboxModule,
    FormsModule,
  ],
  templateUrl: './edit-documents.component.html',
  animations: [
    trigger('slideContent', [
      transition(':enter', [
        style({ opacity: 0, width: '95vw', transform: 'translateX(10vw)' }),
        animate('250ms 300ms ease-out', style({ opacity: 1, width: '100%', transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        style({ position: 'absolute', top: 0, left: 0, width: '95vw' }),
        animate('250ms ease-in', style({ opacity: 0, zIndex: -99, transform: 'translateX(-30vw)' }))
      ])
    ]),
  ]
})
export class EditDocumentsComponent {
  request = input.required<DocumentRequest>();
  onStateChange = input<(state: { hasSelectedDocuments: boolean; document: { documentIds: number[]; remarks: string; }; }) => void>();

  protected registrarRequestService = inject(RegistrarRequestService);

  constructor() {
    effect(() => {
      const callback = this.onStateChange();

      const selectedDocs = this.selectedDocuments();

      if (selectedDocs.length === 0) return;

      // Get IDs of documents to remove
      const documentIdsToRemove = selectedDocs.map(d => d.id);
      const remarks = this.removalRemarks().trim();

      if (callback) {
        callback({
          hasSelectedDocuments: this.hasSelectedDocuments,
          document: {
            documentIds: documentIdsToRemove,
            remarks: remarks || ''
          }
        });
      }
    });
  }

  private selectedIds = signal<number[]>([]);

  documents = computed<DocumentCard[]>(() => {
    const requestData = this.request();
    if (!requestData) return [];

    const docs = requestData.documents || [];
    const currentSelections = this.selectedIds();

    return docs.map(item => ({
      id: item.documentId,
      name: item.documentName,
      selected: currentSelections.includes(item.documentId),
    }));
  });

  selectedDocuments = computed(() =>
    this.documents().filter(card => card.selected)
  );

  showRemarksDialog = signal(false);
  removalRemarks = signal('');

  isUpdating = input<boolean>(false);

  protected requestService = inject(RequestService);

  toggleDocumentSelection(card: DocumentCard): void {
    this.selectedIds.update(ids => {
      return ids.includes(card.id)
        ? ids.filter(id => id !== card.id)
        : [...ids, card.id];
    });
  }

  /**
   * Check if any documents are selected
   */
  get hasSelectedDocuments(): boolean {
    return this.selectedDocuments().length > 0;
  }

  /**
   * Get selected document names for display
   */
  get selectedDocumentNames(): string {
    return this.selectedDocuments().map(d => d.name).join(', ');
  }


}