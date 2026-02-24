import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileSpreadsheet, Download, Database } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import ExcelExportButton from '@/components/admin/ExcelExportButton';

const ExportDataPage = () => {
    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-20">
            <Helmet><title>Export Data</title></Helmet>
            <AdminPageHeader 
                title="Export Data" 
                description="Download system data in Excel format for analysis or backup."
                breadcrumbs={[{label: 'Dashboard', href: '/admin'}, {label: 'Export'}]}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Database className="h-5 w-5 text-blue-600" />
                            Master Data Export
                        </CardTitle>
                        <CardDescription>Export your core data registries.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-4 bg-slate-50 rounded-lg border">
                            <h4 className="font-medium mb-2 text-sm text-slate-700">Fabric Master</h4>
                            <div className="grid grid-cols-1 gap-2">
                                <ExcelExportButton variant="outline" className="w-full justify-start" />
                            </div>
                            <p className="text-xs text-slate-500 mt-2">
                                Includes Base Fabrics, Finish Fabrics, and Fancy Finish Fabrics.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileSpreadsheet className="h-5 w-5 text-green-600" />
                            Export Instructions
                        </CardTitle>
                        <CardDescription>Please read before exporting.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm text-slate-600">
                        <ul className="list-disc pl-4 space-y-2">
                            <li>Exports generate <strong>.xlsx</strong> files compatible with Microsoft Excel and Google Sheets.</li>
                            <li>Large datasets may take a few moments to generate.</li>
                            <li>Exported files include all current active records.</li>
                            <li>Sensitive data (like passwords) is never exported.</li>
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default ExportDataPage;