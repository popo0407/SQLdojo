import { useState, useCallback } from 'react';

export const useSidebarWidth = () => {
  const [sidebarWidth, setSidebarWidth] = useState(400);

  const updateSidebarWidth = useCallback((width: number) => {
    setSidebarWidth(width);
  }, []);

  return {
    sidebarWidth,
    updateSidebarWidth
  };
};