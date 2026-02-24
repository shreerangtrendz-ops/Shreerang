import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { HardDrive, CheckCircle, AlertCircle, Loader2, ShieldCheck, FileText, UploadCloud } from 'lucide-react';
import { GoogleDriveService } from '@/services/GoogleDriveService';

const GoogleDriveAuthModal = ({ isOpen, onClose, onAuthSuccess }) => {
    const [status, setStatus] = useState('idle'); // idle, loading, success, error
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        // Listen for auth success event from the service
        const handleConnected = () => {
            setStatus('success');
            setTimeout(() => {
                if(onAuthSuccess) onAuthSuccess();
                onClose();
            }, 1500);
        };

        window.addEventListener('gdrive_connected', handleConnected);
        return () => window.removeEventListener('gdrive_connected', handleConnected);
    }, [onClose, onAuthSuccess]);

    const handleAuthorize = async () => {
        try {
            setStatus('loading');
            await GoogleDriveService.signIn();
            // The signIn triggers a popup. 
            // The success is handled by the event listener above when the popup callback fires.
        } catch (error) {
            console.error(error);
            setStatus('error');
            setErrorMsg('Failed to initialize Google Sign-In. Please check your network or popup blocker.');
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                    <div className="mx-auto bg-blue-50 p-3 rounded-full mb-4">
                        <HardDrive className="h-8 w-8 text-blue-600" />
                    </div>
                    <DialogTitle className="text-center text-xl">Connect Google Drive</DialogTitle>
                    <DialogDescription className="text-center">
                        Authorize access to sync fabric designs and back up your inventory images automatically.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="rounded-lg border p-4 bg-slate-50 space-y-3">
                        <h4 className="font-medium text-sm text-slate-900 flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-green-600" /> 
                            Permissions Requested
                        </h4>
                        <ul className="text-sm text-slate-600 space-y-2">
                            <li className="flex items-start gap-2">
                                <FileText className="h-4 w-4 mt-0.5 text-slate-400" />
                                <span>Read and write access to files created by this app</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <UploadCloud className="h-4 w-4 mt-0.5 text-slate-400" />
                                <span>Upload fabric images and documents</span>
                            </li>
                        </ul>
                    </div>

                    {status === 'error' && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Authentication Failed</AlertTitle>
                            <AlertDescription>{errorMsg}</AlertDescription>
                        </Alert>
                    )}

                    {status === 'success' && (
                        <Alert className="bg-green-50 border-green-200 text-green-800">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <AlertTitle>Success!</AlertTitle>
                            <AlertDescription>Google Drive Connected.</AlertDescription>
                        </Alert>
                    )}
                </div>

                <DialogFooter className="flex-col sm:flex-col gap-2">
                    <Button 
                        size="lg" 
                        className="w-full gap-2" 
                        onClick={handleAuthorize}
                        disabled={status === 'loading' || status === 'success'}
                    >
                        {status === 'loading' ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" /> 
                                Connecting...
                            </>
                        ) : (
                            <>
                                <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" alt="G" className="h-4 w-4" />
                                Authorize with Google
                            </>
                        )}
                    </Button>
                    <Button variant="ghost" className="w-full" onClick={onClose}>
                        Cancel
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default GoogleDriveAuthModal;