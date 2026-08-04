import { Component, input, computed } from "@angular/core";

import { DocumentOption, DocumentSection } from "@src/app/features/document-request/student-request.model";


@Component({
    selector: 'catalog-tab',
    standalone: true,
    templateUrl: './catalog.component.html'
})
export class CatalogTabComponent {
    readonly documentOptions = input<DocumentOption[]>([]);
 
    protected sections  = computed<DocumentSection[]>(()=>{
        const categories = [...new Set(this.documentOptions().map(doc => doc.category))];

        return categories.map(category => ({
            title: category,
            items: this.documentOptions().filter(doc => doc.category === category)
        }));
    })
}