import { Type, TemplateRef } from '@angular/core';

/**
 * Footer action button configuration
 */
export interface FooterAction {
  /** Button label */
  label: string;
  /** PrimeNG button icon (e.g., 'pi pi-save') */
  icon?: string;
  /** Whether the button is treated as a text */
  text?: boolean | (() => boolean);
  /** Whether the button is outlined   */
  outlined?: boolean | (() => boolean);
  /** Button severity style */
  severity?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'contrast' | 'help';
  /** Whether the button is disabled (can be a function for dynamic state) */
  disabled?: boolean | (() => boolean);
  /** Whether the button is visible (can be a function for dynamic visibility) */
  visible?: boolean | (() => boolean);
  /** Button style class */
  styleClass?: string;
  /** Button position in footer (default: 'right') */
  position?: 'left' | 'right';
  /** Button width (e.g., 'full', 'auto', '320px') */
  width?: 'full' | 'auto' | string;
  /** Action to execute when button is clicked */
  action: () => void | Promise<void>;
}

/**
 * Configuration for a single view within the master dialog
 */
export interface DialogViewConfig {
  /** Unique identifier for this view */
  id: string;
  /** Component to render for this view */
  component: Type<any>;
  /** Width in pixels for this specific view (optional) */
  width?: number;
  /** Header text for this view (optional, can be overridden by template) */
  header?: string;
  /** Whether to show back button when this view is active */
  showBackButton?: boolean;
  /** Data to pass as inputs to the component */
  data?: Record<string, any>;
  /** Callback functions to pass to the component (e.g., onSave, onCancel) */
  callbacks?: {
    onSave?: (data?: any) => void;
    onCancel?: () => void;
    onNext?: (data?: any) => void;
    [key: string]: ((data?: any) => void) | undefined;
  };
  /** Footer action buttons for this view */
  footerActions?: FooterAction[];
}

/**
 * Main configuration for the master dialog
 */
export interface MasterDialogConfig {
  /** Array of view configurations */
  views: DialogViewConfig[];
  /** ID of the initial view to show */
  initialView: string;
  /** Default width in pixels for views without specific width */
  defaultWidth?: number;
  /** Whether to show footer */
  showFooter?: boolean;
  /** Optional custom footer template */
  footerTemplate?: TemplateRef<any>;
  /** Optional custom header template */
  headerTemplate?: TemplateRef<any>;
  /** Callback when dialog is closed */
  onClose?: () => void;
  /** Callback when view changes */
  onViewChange?: (viewId: string, previousViewId: string) => void;
}

/**
 * Navigation direction for animations
 */
export type NavigationDirection = 'forward' | 'backward' | 'none';
