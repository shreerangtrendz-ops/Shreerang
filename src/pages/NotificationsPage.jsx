import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Loader2, Bell, CheckCircle, XCircle, Info, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const NotificationsPage = () => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchRequests = useCallback(async () => {
        setLoading(true);
        try {
            if (!user) return;
            const { data, error } = await supabase
                .from('price_requests')
                .select(`
                    id,
                    status,
                    requested_price,
                    notes,
                    updated_at,
                    product:products(name, sku)
                `)
                .eq('requested_by', user.id)
                .neq('status', 'pending')
                .order('updated_at', { ascending: false });

            if (error) throw error;
            setRequests(data);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: `Failed to fetch notifications: ${error.message}` });
        } finally {
            setLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    const handleResubmit = (request) => {
        // This is a placeholder for the resubmission logic
        toast({
            title: 'Resubmit Request',
            description: "This feature isn't implemented yet. You would be redirected to request a new price.",
        });
        // In a full implementation, you might navigate to the product page
        // or open the price request dialog again.
        // For now, we'll just show a toast.
    };

    const StatusIcon = ({ status }) => {
        if (status === 'approved') return <CheckCircle className="h-6 w-6 text-green-500" />;
        if (status === 'rejected') return <XCircle className="h-6 w-6 text-red-500" />;
        return <Info className="h-6 w-6 text-gray-500" />;
    };

    return (
        <>
            <Helmet>
                <title>Notifications - Shreerang Trendz</title>
            </Helmet>
            <div className="container mx-auto py-8 px-4">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold">Notifications</h1>
                    <Button variant="outline" size="icon" onClick={fetchRequests} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
                {loading ? (
                    <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
                ) : requests.length === 0 ? (
                    <div className="text-center py-16 bg-gray-50 rounded-lg">
                        <Bell className="mx-auto h-12 w-12 text-gray-400" />
                        <h2 className="mt-4 text-xl font-semibold">No New Notifications</h2>
                        <p className="text-gray-500 mt-2">You have no price request updates yet.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {requests.map(req => (
                            <div key={req.id} className="bg-white p-4 rounded-lg shadow-sm flex items-start space-x-4">
                                <StatusIcon status={req.status} />
                                <div className="flex-1">
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-semibold">{req.product.name}</h3>
                                        <span className="text-xs text-gray-500">{format(new Date(req.updated_at), 'dd MMM yyyy, p')}</span>
                                    </div>
                                    <p className="text-sm text-gray-600">
                                        Your price request for ₹{req.requested_price.toFixed(2)} has been 
                                        <Badge variant={req.status === 'approved' ? 'default' : 'destructive'} className="ml-2">{req.status}</Badge>.
                                    </p>
                                    {req.notes && <p className="mt-2 text-sm bg-gray-100 p-2 rounded-md"><strong>Director's Note:</strong> {req.notes}</p>}
                                    {req.status === 'rejected' && (
                                        <div className="mt-3">
                                            <Button size="sm" variant="secondary" onClick={() => handleResubmit(req)}>
                                                Resubmit Request
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
};

export default NotificationsPage;