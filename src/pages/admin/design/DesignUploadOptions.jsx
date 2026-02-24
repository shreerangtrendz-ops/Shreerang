import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Layers, Grid, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

const DesignUploadOptions = () => {
    const navigate = useNavigate();

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-20">
            <Helmet><title>Upload Designs</title></Helmet>
            <AdminPageHeader 
                title="Design Upload" 
                breadcrumbs={[{label: 'Dashboard', href: '/admin'}, {label: 'Upload Options'}]}
            />

            <div className="grid md:grid-cols-2 gap-6 p-6">
                <Card className="hover:border-primary/50 cursor-pointer transition-all hover:shadow-lg group" onClick={() => navigate('/admin/fabric-master/finish')}>
                    <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
                        <div className="h-20 w-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                            <Layers className="h-10 w-10" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold mb-2">Upload to Specific Fabric</h3>
                            <p className="text-muted-foreground text-sm">
                                Navigate to a specific Finish Fabric and manage its designs directly. Best for organized, single-fabric updates.
                            </p>
                        </div>
                        <Button className="w-full mt-4" variant="outline">
                            Select Fabric <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </CardContent>
                </Card>

                <Card className="hover:border-primary/50 cursor-pointer transition-all hover:shadow-lg group" onClick={() => navigate('/admin/bulk-image-upload')}>
                    <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
                        <div className="h-20 w-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center group-hover:bg-green-100 transition-colors">
                            <Grid className="h-10 w-10" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold mb-2">Bulk Library Upload</h3>
                            <p className="text-muted-foreground text-sm">
                                Upload multiple images at once to the library and assign them to fabrics in batch. Best for rapid ingestion of new collections.
                            </p>
                        </div>
                        <Button className="w-full mt-4">
                            Start Bulk Upload <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default DesignUploadOptions;