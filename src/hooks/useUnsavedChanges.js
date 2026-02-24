import { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export function useUnsavedChanges(isDirty) {
  const [showModal, setShowModal] = useState(false);
  const [pendingPath, setPendingPath] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Handle browser back/refresh
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Handle in-app navigation blocking (simplified for v6)
  // Note: True blocking in v6.16 requires unstable_useBlocker which acts differently across versions.
  // We will strictly enforce "Back" button and "Cancel" button handling via this hook for consistency within our UI controls.
  
  const proceedNavigation = useCallback(() => {
    if (pendingPath) {
      navigate(pendingPath);
    } else {
      navigate(-1); // Default back
    }
    setShowModal(false);
  }, [navigate, pendingPath]);

  const handleBack = (path = null) => {
    if (isDirty) {
      setPendingPath(path);
      setShowModal(true);
    } else {
      if (path) navigate(path);
      else navigate(-1);
    }
  };

  return {
    showUnsavedModal: showModal,
    setShowUnsavedModal: setShowModal,
    handleNavigation: handleBack,
    proceedNavigation,
    stayOnPage: () => setShowModal(false)
  };
}