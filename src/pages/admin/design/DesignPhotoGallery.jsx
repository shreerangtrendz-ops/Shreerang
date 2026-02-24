import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/lib/customSupabaseClient';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Image as ImageIcon } from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';

const DesignPhotoGallery = () => {
    const [photos, setPhotos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchPhotos();
    }, []);

    const fetchPhotos = async () => {
        setLoading(true);
        // Fetch from finish_fabric_designs
        const { data: designs } = await supabase
            .from('finish_fabric_designs')
            .select('id, design_number, design_name, design_photo_url, finish_fabrics(finish_fabric_name)')
            .not('design_photo_url', 'is', null)
            .order('created_at', { ascending: false });
        
        // Also could fetch from design_set_components if needed
        
        if (designs) setPhotos(designs);
        setLoading(false);
    };

    const filteredPhotos = photos.filter(p => 
        p.design_number.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.finish_fabrics?.finish_fabric_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <LoadingSpinner fullHeight />;

    return (
        <div className="space-y-6">
            <Helmet><title>Design Gallery</title></Helmet>
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Design Gallery</h1>
                <div className="relative w-72">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
                    <Input placeholder="Search design no..." className="pl-8" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredPhotos.map(photo => (
                    <Card key={photo.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                        <div className="aspect-square bg-slate-100 relative group">
                            <img src={photo.design_photo_url} alt={photo.design_number} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                <Button variant="secondary" size="sm">View Details</Button>
                            </div>
                        </div>
                        <CardContent className="p-3">
                            <div className="font-bold">{photo.design_number}</div>
                            <div className="text-xs text-muted-foreground truncate">{photo.finish_fabrics?.finish_fabric_name}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default DesignPhotoGallery;