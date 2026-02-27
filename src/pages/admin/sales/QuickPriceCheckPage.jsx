import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/lib/customSupabaseClient';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2, IndianRupee, Image as ImageIcon, Box } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';

const QuickPriceCheckPage = () => {
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [hasSearched, setHasSearched] = useState(false);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setLoading(true);
        setHasSearched(true);
        setResult(null);

        try {
            const { data, error } = await supabase
                .from('finish_fabric_designs')
                .select(`id, design_number, design_photo_url, status, sales_price_per_meter, finish_fabrics(finish_fabric_name)`)
                .ilike('design_number', `%${searchQuery.trim()}%`)
                .limit(1)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    // Not found
                    toast({ description: "No design found with that number." });
                } else {
                    throw error;
                }
            } else {
                setResult(data);
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to search design.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-3xl mx-auto pb-20">
            <Helmet><title>Quick Price Check | Shreerang</title></Helmet>
            <AdminPageHeader
                title="Quick Price Check"
                description="Instantly fetch sales prices and availability for any design."
            />

            <Card className="border-indigo-100 shadow-md">
                <CardHeader className="bg-indigo-50/50 pb-4 border-b border-indigo-100">
                    <CardTitle className="text-xl text-indigo-900">Price Finder</CardTitle>
                    <CardDescription>Enter a Design Number (e.g. D-1001) to find its price.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <form onSubmit={handleSearch} className="flex gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                            <Input
                                autoFocus
                                placeholder="Scan or type Design Number..."
                                className="pl-10 h-12 text-lg font-medium bg-slate-50 focus:bg-white"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Button type="submit" disabled={loading || !searchQuery.trim()} className="h-12 px-6 bg-indigo-600 hover:bg-indigo-700">
                            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Check Price'}
                        </Button>
                    </form>

                    <div className="mt-8">
                        {loading && (
                            <div className="flex flex-col items-center justify-center py-12 text-indigo-600 space-y-4">
                                <Loader2 className="h-10 w-10 animate-spin" />
                                <p className="font-medium animate-pulse">Fetching details...</p>
                            </div>
                        )}

                        {!loading && hasSearched && !result && (
                            <div className="text-center py-12 px-4 rounded-xl border border-dashed border-slate-300 bg-slate-50">
                                <p className="text-slate-600 font-medium text-lg">No design found</p>
                                <p className="text-slate-400 text-sm mt-1">Please check the number and try again.</p>
                            </div>
                        )}

                        {!loading && result && (
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col sm:flex-row">
                                <div className="sm:w-1/3 bg-slate-100 relative aspect-square sm:aspect-auto sm:min-h-[250px] flex items-center justify-center">
                                    {result.design_photo_url ? (
                                        <img src={result.design_photo_url} alt={result.design_number} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="flex flex-col items-center text-slate-400">
                                            <ImageIcon className="h-12 w-12 mb-2 opacity-50" />
                                            <span className="text-sm font-medium">No Image</span>
                                        </div>
                                    )}
                                </div>
                                <div className="p-6 sm:w-2/3 flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h3 className="text-2xl font-bold tracking-tight text-slate-900">{result.design_number}</h3>
                                                <p className="text-indigo-600 font-medium">{result.finish_fabrics?.finish_fabric_name || 'Fabric Unassigned'}</p>
                                            </div>
                                            <Badge variant={result.status === 'Active' ? 'success' : 'secondary'} className="text-sm px-3 py-1">
                                                {result.status || 'Unknown'}
                                            </Badge>
                                        </div>
                                    </div>

                                    <div className="mt-6 space-y-4">
                                        <div className="bg-green-50 rounded-xl p-4 border border-green-100 flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-green-800">
                                                <IndianRupee className="h-5 w-5" />
                                                <span className="font-semibold text-lg">Sales Price</span>
                                            </div>
                                            <div className="text-3xl font-bold text-green-700">
                                                {result.sales_price_per_meter ? `₹${Number(result.sales_price_per_meter).toFixed(2)}` : 'Ask Admin'}
                                                <span className="text-sm font-normal text-green-600/70 ml-1">/ mtr</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                            <Box className="h-5 w-5 text-indigo-500" />
                                            <span className="font-medium">Ready Stock:</span>
                                            <span className="font-bold text-slate-900 ml-auto">Check exact stock in Godown</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default QuickPriceCheckPage;
