import {
  Component,
  model,
  input,
  output,
  computed,
  signal,
  TemplateRef,
  Type,
  effect,
  ContentChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';

import {
  MasterDialogConfig,
  DialogViewConfig,
  NavigationDirection,
  FooterAction
} from './master-dialog.config';
import { trigger, transition, style, animate, keyframes } from '@angular/animations';

@Component({
  selector: 'app-master-dialog',
  standalone: true,
  imports: [
    CommonModule,
    DialogModule,
    ButtonModule
  ],
  templateUrl: './master-dialog.component.html',
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
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        style({
          position: 'absolute',
          top: 0,
          right: 0,
          width: '*',
        }),
        animate('250ms ease-in', style({ opacity: 0 }))
      ])
    ])
  ]
})
export class MasterDialogComponent {
  // Dialog visibility (two-way binding)
  visible = model<boolean>(false);

  // Configuration input
  config = input<MasterDialogConfig>();

  // Content-projected templates (auto-detected from parent)
  @ContentChild('footer') contentFooterTemplate!: TemplateRef<any>;

  // Expose component instance for parent to call navigation methods
  dialogInstance = this;

  // Outputs for parent component to react to events
  viewChange = output<{ viewId: string; previousViewId: string; }>();
  close = output<void>();

  // Internal state
  currentViewId = signal<string>('');
  private viewHistory = signal<string[]>([]);
  private navigationDirection = signal<NavigationDirection>('none');
  baseDialogWidth = signal<string>('80vw');
  dialogWidth = signal<string>('');
  private previousVisibleValue: boolean = false;

  constructor() {
    // Track changes to visible model
    effect(() => {
      const currentValue = this.visible();

      if (currentValue !== this.previousVisibleValue) {
        if (currentValue) {
          this.onDialogOpen();
        } else {
          this.onDialogClose();
        }
        this.previousVisibleValue = currentValue;
      }
    });
  }

  // Computed properties
  private viewMap = computed(() => {
    const map = new Map<string, DialogViewConfig>();
    this.config()?.views.forEach(view => map.set(view.id, view));
    return map;
  });

  currentViewConfig = computed(() =>
    this.viewMap().get(this.currentViewId())
  );

  /**
   * Public property to access the current view configuration
   * Allows parent components to access currentView.id, currentView.header, etc.
   * Returns the actual value (not a signal) for direct template access
   */
  get currentView(): DialogViewConfig | undefined {
    return this.currentViewConfig();
  }

  showBackButton = computed(() => {
    const config = this.currentViewConfig();
    return config?.showBackButton && this.viewHistory().length > 0;
  });

  dialogHeader = computed(() => {
    const config = this.currentViewConfig();
    return config?.header || '';
  });

  currentComponent = computed(() => {
    return this.currentViewConfig()?.component;
  });

  currentComponentData = computed(() => {
    const data = this.currentViewConfig()?.data;
    const callbacks = this.currentViewConfig()?.callbacks;
    return { ...data, ...callbacks };
  });

  headerTemplate = computed(() => {
    const template = this.config()?.headerTemplate;
    return template ?? null;
  });

  footerTemplate = computed(() => {
    // Prefer content-projected template, fall back to config
    return this.contentFooterTemplate ?? this.config()?.footerTemplate ?? null;
  });

  footerActions = computed(() => {
    return this.currentViewConfig()?.footerActions ?? null;
  });

  leftFooterActions = computed(() => {
    const actions = this.footerActions();
    if (!actions) return [];
    return actions.filter(btn => btn.position === 'left');
  });

  rightFooterActions = computed(() => {
    const actions = this.footerActions();
    if (!actions) return [];
    return actions.filter(btn => btn.position === 'right' || btn.position === undefined);
  });

  evaluateVisibility(visible?: boolean | (() => boolean)): boolean {
    if (visible === undefined) return true;
    if (typeof visible === 'boolean') return visible;
    return visible();
  }

  evaluateDisabled(disabled?: boolean | (() => boolean)): boolean {
    if (disabled === undefined) return false;
    if (typeof disabled === 'boolean') return disabled;
    return disabled();
  }

  executeAction(action: () => void | Promise<void>): void {
    action();
  }

  private onDialogOpen(): void {
    const initialView = this.config()?.initialView;
    if (initialView && !this.currentViewId()) {
      this.currentViewId.set(initialView);
      this.updateDialogWidth();
    }
  }

  private onDialogClose(): void {
    this.reset();
    this.config()?.onClose?.();
    this.close.emit();
  }

  /**
   * Navigate to a specific view
   * @param viewId - ID of the view to navigate to
   * @param addToHistory - Whether to add current view to history stack (default: true)
   */
  navigateToView(viewId: string, addToHistory = true): void {
    const previousViewId = this.currentViewId();

    // Validate view exists
    if (!this.viewMap().has(viewId)) {
      console.error(`View with id "${viewId}" not found in configuration`);
      return;
    }

    // Add current view to history if navigating forward
    if (addToHistory && previousViewId) {
      this.viewHistory.update(history => [...history, previousViewId]);
      this.navigationDirection.set('forward');
    } else {
      this.navigationDirection.set('backward');
    }

    // Update current view
    this.currentViewId.set(viewId);
    this.updateDialogWidth();

    // Show dialog if not visible
    if (!this.visible()) {
      this.visible.set(true);
    }

    // Emit view change event
    this.viewChange.emit({ viewId, previousViewId });
  }

  /**
   * Navigate back to the previous view in history
   */
  goBack(): void {
    const history = this.viewHistory();
    if (history.length === 0) {
      this.onDialogClose();
      return;
    }

    const previousView = history[history.length - 1];
    this.viewHistory.update(h => h.slice(0, -1));
    this.navigateToView(previousView, false);
  }

  /**
   * Reset dialog to initial state
   */
  reset(): void {
    this.currentViewId.set('');
    this.viewHistory.set([]);
    this.navigationDirection.set('none');
  }

  /**
   * Handle dialog visibility change
   */
  onVisibleChange(visible: boolean): void {
    this.visible.set(visible);

    if (!visible) {
      // Reset state when dialog closes
      this.reset();
      this.config()?.onClose?.();
      this.close.emit();
    } else {
      // Always navigate to initial view when dialog opens to ensure content renders
      const initialView = this.config()?.initialView;
      if (initialView) {
        this.currentViewId.set(initialView);
        this.viewHistory.set([]);
        this.updateDialogWidth();
      }
    }
  }

  /**
   * Update dialog width based on current view configuration
   */
  private updateDialogWidth(): void {
    const config = this.currentViewConfig();
    const defaultWidth = this.config()?.defaultWidth || 650;
    const viewWidth = config?.width || defaultWidth;

    // Check if mobile
    const isMobile = window.innerWidth < 768;
    const width = isMobile ? '95vw' : `${viewWidth}px`;

    this.dialogWidth.set(width);
  }

  /**
   * Get current view ID (for debugging or external use)
   */
  getCurrentViewId(): string {
    return this.currentViewId();
  }

  /**
   * Get view history (for debugging or external use)
   */
  getViewHistory(): string[] {
    return this.viewHistory();
  }

  /**
   * Check if a specific view exists in configuration
   */
  hasView(viewId: string): boolean {
    return this.viewMap().has(viewId);
  }
}
