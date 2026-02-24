import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { GoogleDriveService } from '@/services/GoogleDriveService';

// This page is a fallback if we use redirect mode, or just a landing page for confirmation.
const GoogleAuthCallback = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [status, setStatus] = useState('processing');

    useEffect(() => {
        // Parse hash for access_token (Implicit flow / Token model)
        const hash = location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        
        if (accessToken) {
            // Manually construct the token response object expected by our service
            const tokenResponse = {
                access_token: accessToken,
                expires_in: params.get('expires_in'),
                scope: params.get('scope'),
                token_type: params.get('token_type')
            };
            
            GoogleDriveService.handleAuthSuccess(tokenResponse);
            setStatus('success');
            setTimeout(() => navigate('/admin/settings'), 2000);
        } else {
            // Check for error in query params
            const queryParams = new URLSearchParams(location.search);
            if (queryParams.get('error')) {
                setStatus('error');
            } else {
                // If no token and no error, maybe just landed here. Redirect back.
                navigate('/admin/settings');
            }
        }
    }, [location, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <Card className="w-[400px]">
                <CardHeader>
                    <CardTitle className="text-center">Google Drive Authorization</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center py-6">
                    {status === 'processing' && (
                        <>
                            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                            <p>Completing authorization...</p>
                        </>
                    )}
                    {status === 'success' && (
                        <>
                            <CheckCircle className="h-10 w-10 text-green-500 mb-4" />
                            <p className="text-green-700 font-medium">Successfully Connected!</p>
                            <p className="text-sm text-slate-500">Redirecting to settings...</p>
                        </>
                    )}
                    {status === 'error' && (
                        <>
                            <XCircle className="h-10 w-10 text-red-500 mb-4" />
                            <p className="text-red-700 font-medium">Authorization Failed</p>
                            <p className="text-sm text-slate-500">Please try again.</p>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default GoogleAuthCallback;