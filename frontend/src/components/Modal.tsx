import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
  bodyClassName?: string;
}

const Modal = ({ isOpen, onClose, title, children, maxWidth = "max-w-md", bodyClassName = "p-5 overflow-y-auto custom-scrollbar" }: ModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className={`relative bg-white dark:bg-[#18181b] rounded-2xl shadow-2xl w-full ${maxWidth} max-h-[90vh] overflow-hidden flex flex-col m-4 animate-in fade-in zoom-in-95 duration-200`}>
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-white/10 shrink-0">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className={`flex-1 min-h-0 ${bodyClassName}`}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
