import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { BookOpen, Upload, HardDrive, MessageCircle } from 'lucide-react';

const GuidelinesPage = () => {
    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-20">
            <Helmet><title>User Guidelines</title></Helmet>
            <AdminPageHeader 
                title="System User Manual" 
                breadcrumbs={[{label: 'Dashboard', href: '/admin'}, {label: 'Guidelines'}]}
            />

            <Tabs defaultValue="bulk" className="w-full">
                <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
                    <TabsTrigger value="bulk">Bulk Upload</TabsTrigger>
                    <TabsTrigger value="drive">Google Drive</TabsTrigger>
                    <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
                    <TabsTrigger value="compression">Compression</TabsTrigger>
                </TabsList>

                <div className="mt-6">
                    <TabsContent value="bulk" className="space-y-4">
                        <GuidelineCard 
                            title="Bulk Upload System" 
                            icon={Upload}
                            steps={[
                                "Select the type of data (Fabrics, Garments) you wish to upload.",
                                "Download the strict Excel template provided.",
                                "Fill the data. Do NOT change column headers. Use semicolons (;) for multi-value fields like 'Alias Names'.",
                                "Upload the file. Review the preview table for any red flags.",
                                "Click Upload. Do not close the tab until the progress bar reaches 100%."
                            ]}
                            tips={[
                                "Max file size is 10MB.",
                                "Test with 5 rows first before uploading 500.",
                                "If upload fails, check the error log for specific row numbers."
                            ]}
                        />
                    </TabsContent>
                    
                    <TabsContent value="drive" className="space-y-4">
                        <GuidelineCard 
                            title="Google Drive Sync" 
                            icon={HardDrive}
                            steps={[
                                "Navigate to Settings > Google Drive.",
                                "Authenticate using your business Google Workspace account.",
                                "Once connected, the system creates a folder structure automatically.",
                                "Enable 'Auto-Upload' to have every new fabric image backed up instantly."
                            ]}
                            tips={[
                                "Disconnecting does not delete files from Drive.",
                                "Files are organized by Year > Month."
                            ]}
                        />
                    </TabsContent>

                    <TabsContent value="whatsapp" className="space-y-4">
                        <GuidelineCard 
                            title="WhatsApp Business API" 
                            icon={MessageCircle}
                            steps={[
                                "Obtain your Business ID and Access Token from Meta Developers Portal.",
                                "Enter them in Settings > WhatsApp.",
                                "Use the 'Send via WhatsApp' button on Order or Fabric pages.",
                                "Select a pre-approved template to send."
                            ]}
                            tips={[
                                "You cannot send free-text promotional messages to new customers (Meta Policy).",
                                "Templates must be approved in the Meta portal first."
                            ]}
                        />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
};

const GuidelineCard = ({ title, icon: Icon, steps, tips }) => (
    <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Icon className="h-6 w-6 text-primary" />
                {title}
            </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
            <div>
                <h3 className="font-semibold mb-3">Process Flow</h3>
                <ol className="list-decimal pl-5 space-y-2 text-slate-700">
                    {steps.map((s, i) => <li key={i}>{s}</li>)}
                </ol>
            </div>
            <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                <h3 className="font-semibold text-blue-900 mb-2 text-sm">Pro Tips</h3>
                <ul className="list-disc pl-5 space-y-1 text-sm text-blue-800">
                    {tips.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
            </div>
        </CardContent>
    </Card>
);

export default GuidelinesPage;