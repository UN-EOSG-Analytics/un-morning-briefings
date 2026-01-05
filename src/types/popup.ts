export type PopupType = 'success' | 'error' | 'warning' | 'info' | 'confirm';

export interface PopupAction {
  label: string;
  onClick: () => void | Promise<void>;
  variant?: 'default' | 'destructive';
}

export interface Popup {
  id: string;
  type: PopupType;
  title: string;
  message: string;
  actions?: PopupAction[];
  autoClose?: boolean;
  duration?: number; // in ms, default 5000
  onClose?: () => void;
}
