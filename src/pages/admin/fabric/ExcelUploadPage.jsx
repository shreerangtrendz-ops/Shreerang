import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { UploadCloud, FileSpreadsheet, Download, ArrowLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { ExportService } from '@/lib/ExportService';
import ExcelImportModal from '@/components/admin/fabric/ExcelImportModal';

const ExcelUploadPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [pageType, setPageType] = useState('base_fabric');
    const [title, setTitle] = useState('Import Data');

    useEffect(() => {
        if (location.pathname.includes('/finish/import')) {
            setPageType('finish_fabric');
            setTitle('Import Finish Fabrics');
        } else if (location.pathname.includes('/fancy/import')) {
            setPageType('fancy_finish');
            setTitle('Import Fancy Finish Fabrics');
        } else {
            setPageType('base_fabric');
            setTitle('Import Base Fabrics (Griege)');
        }
    }, [location]);

    const handleDownloadTemplate = () => {
        if (pageType === 'base_fabric') ExportService.generateBaseFabricTemplate();
        if (pageType === 'finish_fabric') ExportService.generateFinishFabricTemplate();
        if (pageType === 'fancy_finish') ExportService.generateFancyFinishTemplate();
    };

    const getBackLink = () => {
        if (pageType === 'finish_fabric') return '/admin/fabric-master/finish';
        if (pageType === 'fancy_finish') return '/admin/fabric-master/fancy';
        return '/admin/fabric-master/base';
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-20">
            <Helmet><title>{title}</title></Helmet>
            <AdminPageHeader 
                title={title} 
                description="Bulk upload data into the system using Excel templates."
                breadcrumbs={[
                    {label: 'Fabric Master', href: '/admin/fabric-master'}, 
                    {label: 'Import', href: location.pathname}
                ]}
                onBack={() => navigate(getBackLink())}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="md:col-span-1 border-blue-100 bg-blue-50/30">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileSpreadsheet className="h-5 w-5 text-green-600" />
                            1. Download Template
                        </CardTitle>
                        <CardDescription>Get the correct format for your data.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col items-center text-center space-y-4 py-8">
                            <div className="p-4 bg-white rounded-full shadow-sm">
                                <Download className="h-8 w-8 text-green-600" />
                            </div>
                            <div>
                                <h3 className="font-medium text-lg">Standard {pageType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Template</h3>
                                <p className="text-sm text-slate-500 mt-2">Includes all required columns and format.</p>
                            </div>
                            <Button className="w-full gap-2 mt-4" onClick={handleDownloadTemplate}>
                                Download Excel Template
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="md:col-span-1 border-indigo-100 bg-indigo-50/30">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <UploadCloud className="h-5 w-5 text-blue-600" />
                            2. Start Import
                        </CardTitle>
                        <CardDescription>Upload your filled template.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div 
                            className="border-2 border-dashed border-indigo-200 bg-white rounded-lg p-6 flex flex-col items-center text-center space-y-4 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-all py-8" 
                            onClick={() => setImportModalOpen(true)}
                        >
                            <div className="p-4 bg-indigo-50 rounded-full">
                                <UploadCloud className="h-8 w-8 text-indigo-600" />
                            </div>
                            <div>
                                <h3 className="font-medium text-lg">Launch Import Wizard</h3>
                                <p className="text-sm text-slate-500 mt-2">Select category, map columns, and validate.</p>
                            </div>
                            <Button variant="secondary" className="w-full mt-4">Start Import Wizard</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <ExcelImportModal 
                isOpen={importModalOpen} 
                onClose={() => setImportModalOpen(false)} 
                type={pageType}
            />
        </div>
    );
};

export default ExcelUploadPage;