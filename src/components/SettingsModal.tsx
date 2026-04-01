import React, { useState, useEffect } from 'react';
import { X, Key } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (key: string) => void;
}

export default function SettingsModal({ isOpen, onClose, onSave }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    const storedKey = localStorage.getItem('googleMapsApiKey');
    if (storedKey) {
      setApiKey(storedKey);
    }
  }, [isOpen]);

  const handleSave = () => {
    localStorage.setItem('googleMapsApiKey', apiKey);
    onSave(apiKey);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#151619] border border-white/10 rounded-xl shadow-2xl w-[400px] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Key className="w-4 h-4 text-emerald-400" />
            API Settings
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-2">Google Maps API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
            />
            <p className="text-[10px] text-zinc-500 mt-2">
              Required to unlock the Google 3D Tiles layer. Your key is stored locally in your browser.
            </p>
          </div>
        </div>
        <div className="p-4 border-t border-white/5 flex justify-end gap-3 bg-black/20">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 rounded-lg hover:bg-emerald-500/30 transition-colors"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}
