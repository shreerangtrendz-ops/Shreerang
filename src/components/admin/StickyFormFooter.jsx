import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const StickyFormFooter = ({ onSave, onCancel, isSaving, saveLabel = "Save Changes", disabled = false }) => {
  return (
    <div className="sticky bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg mt-8 z-40 flex justify-end gap-4 animate-in slide-in-from-bottom-2">
      <Button 
        variant="outline" 
        onClick={onCancel} 
        disabled={isSaving}
        type="button"
      >
        Cancel
      </Button>
      <Button 
        onClick={onSave} 
        disabled={isSaving || disabled}
        type="button"
        className="min-w-[120px]"
      >
        {isSaving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          saveLabel
        )}
      </Button>
    </div>
  );
};

export default StickyFormFooter;