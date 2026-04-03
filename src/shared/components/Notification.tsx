import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import './Notification.css';

type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface Notification {
  id: string;
  message: string;
  type: NotificationType;
}

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: 'danger' | 'primary';
}

interface NotificationContextType {
  notify: (message: string, type?: NotificationType) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotification must be used within a NotificationProvider');
  return context;
};

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [confirmState, setConfirmState] = useState<{ options: ConfirmOptions; resolve: (val: boolean) => void } | null>(null);

  const notify = useCallback((message: string, type: NotificationType = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  }, []);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({ options, resolve });
    });
  }, []);

  const handleConfirm = (value: boolean) => {
    if (confirmState) {
      confirmState.resolve(value);
      setConfirmState(null);
    }
  };

  return (
    <NotificationContext.Provider value={{ notify, confirm }}>
      {children}
      
      {/* Toasts Container */}
      {createPortal(
        <div className="toast-container">
          {notifications.map(n => (
            <div key={n.id} className={`toast toast-${n.type} anim-slide-in-right`}>
              <span className="toast-icon">
                {n.type === 'success' && '✅'}
                {n.type === 'error' && '❌'}
                {n.type === 'warning' && '⚠️'}
                {n.type === 'info' && 'ℹ️'}
              </span>
              <span className="toast-message">{n.message}</span>
            </div>
          ))}
        </div>,
        document.body
      )}

      {/* Confirm Modal */}
      {confirmState && createPortal(
        <div className="confirm-overlay" onClick={() => handleConfirm(false)}>
          <div className="confirm-modal anim-pop-in" onClick={e => e.stopPropagation()}>
            {confirmState.options.title && <h3 className="confirm-title">{confirmState.options.title}</h3>}
            <p className="confirm-message">{confirmState.options.message}</p>
            <div className="confirm-actions">
              <button className="btn btn-outline" onClick={() => handleConfirm(false)}>
                {confirmState.options.cancelLabel || 'ยกเลิก'}
              </button>
              <button 
                className={`btn btn-${confirmState.options.type || 'primary'}`} 
                onClick={() => handleConfirm(true)}
              >
                {confirmState.options.confirmLabel || 'ตกลง'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </NotificationContext.Provider>
  );
};
