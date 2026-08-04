import { Routes } from '@angular/router';
import { PublicPage } from '../public/page/public.page';


export const CLEARANCE_ROUTES: Routes = [
  {
    path: '',
    children: [
      {
        path: 'track/:id',
        component: PublicPage,
      }
    ]
  }
];