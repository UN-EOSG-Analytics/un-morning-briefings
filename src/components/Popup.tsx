'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popup as PopupType } from '@/types/popup';
import { usePopup } from '@/lib/popup-context';
import {
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
} from 'lucide-react';

interface PopupItemProps {
  popup: PopupType;
}

function PopupItem({ popup }: PopupItemProps) {
  const { closePopup } = usePopup();
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (!popup.autoClose) return;

    const timer = setTimeout(() => {
      setIsClosing(true);
      setTimeout(() => {
        closePopup(popup.id);
      }, 300); // Match animation duration
    }, popup.duration);

    return () => clearTimeout(timer);
  }, [popup, closePopup]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      closePopup(popup.id);
    }, 300);
  };

  const getIcon = () => {
    switch (popup.type) {
      case 'success':
        return (
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
        );
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />;
      case 'warning':
        return (
          <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
        );
      case 'info':
      case 'confirm':
        return <Info className="h-5 w-5 text-blue-600 flex-shrink-0" />;
      default:
        return null;
    }
  };

  const getBackgroundColor = () => {
    switch (popup.type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
      case 'confirm':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-slate-50 border-slate-200';
    }
  };

  const getTitleColor = () => {
    switch (popup.type) {
      case 'success':
        return 'text-green-900';
      case 'error':
        return 'text-red-900';
      case 'warning':
        return 'text-yellow-900';
      case 'info':
      case 'confirm':
        return 'text-blue-900';
      default:
        return 'text-slate-900';
    }
  };

  const getMessageColor = () => {
    switch (popup.type) {
      case 'success':
        return 'text-green-800';
      case 'error':
        return 'text-red-800';
      case 'warning':
        return 'text-yellow-800';
      case 'info':
      case 'confirm':
        return 'text-blue-800';
      default:
        return 'text-slate-800';
    }
  };

  return (
    <div
      className={`transform transition-all duration-300 ${
        isClosing
          ? 'translate-x-full opacity-0'
          : 'translate-x-0 opacity-100'
      }`}
    >
      <div
        className={`rounded-lg border p-4 ${getBackgroundColor()}`}
      >
        <div className="flex gap-3">
          <div className="flex-shrink-0 pt-0.5">{getIcon()}</div>

          <div className="flex-1">
            <h3 className={`font-semibold ${getTitleColor()}`}>
              {popup.title}
            </h3>
            <p className={`mt-1 text-sm ${getMessageColor()}`}>
              {popup.message}
            </p>

            {popup.actions && popup.actions.length > 0 && (
              <div className="mt-3 flex gap-2">
                {popup.actions.map((action, index) => (
                  <Button
                    key={index}
                    size="sm"
                    variant={action.variant === 'destructive' ? 'default' : 'outline'}
                    onClick={async () => {
                      await action.onClick();
                      handleClose();
                    }}
                    className={action.variant === 'destructive' ? 'bg-red-600 hover:bg-red-700' : ''}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {popup.autoClose && (
            <button
              onClick={handleClose}
              className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function PopupContainer() {
  const { popups } = usePopup();

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md space-y-3 pointer-events-auto">
      {popups.map((popup) => (
        <PopupItem key={popup.id} popup={popup} />
      ))}
    </div>
  );
}
