import { Component, inject, model } from "@angular/core";
import { FormsModule } from "@angular/forms";

import { DialogModule } from "primeng/dialog";

import { StudentRequestService } from "@features/document-request/student-request.service";
import { Decline } from "@src/app/features/document-request/student-request.model";

@Component({
    selector: 'decline-reason-dialog',
    standalone: true,
    imports: [
        FormsModule,
        DialogModule
    ],
    templateUrl: './decline-reason-dialog.component.html'
})
export class DeclineReasonDialogComponent {
    isVisible = model.required<boolean>();
    selectedDeclinedRequest = model<Decline | null>();

    protected studentRequestService = inject(StudentRequestService);

    closeDialog(): void {
        this.isVisible.set(false);

        setTimeout(() => {
            this.selectedDeclinedRequest.set(null);
        }, 300);
    }
}