import { RequestDocument } from './request.model';
import { Course } from './student-request.model';

export interface AvailableDocument {
  id: number;
  name: string;
  fee: number;
  category: string;
  selected?: boolean;
}

export interface DocumentCard {
  id: number;
  name: string;
  selected: boolean;
}