import React, { useEffect } from 'react';
import { useUIStore } from '../../stores/useUIStore';

export const Toasts: React.FC = () => {
  const { toasts, removeToast } = useUIStore();

  useEffect(() => {
    if (!toasts.length) return;
    const timers = toasts.map(t => setTimeout(() => removeToast(t.id), 4000));
    return () => { timers.forEach(clearTimeout); };
  }, [toasts, removeToast]);

  if (!toasts.length) return null;
  return (
    <div style={{ position: 'fixed', bottom: 12, right: 12, zIndex: 2000, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: bgColor(t.variant),
          color: '#fff',
          padding: '8px 12px',
          borderRadius: 6,
          minWidth: 180,
          boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
          fontSize: 13,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span>{t.message}</span>
          <button onClick={() => removeToast(t.id)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', marginLeft: 8 }}>×</button>
        </div>
      ))}
    </div>
  );
};

function bgColor(variant?: string) {
  switch (variant) {
    case 'success': return '#2d8a48';
    case 'warning': return '#b37900';
    case 'danger': return '#b93838';
    default: return '#333';
  }
}

export default Toasts;
