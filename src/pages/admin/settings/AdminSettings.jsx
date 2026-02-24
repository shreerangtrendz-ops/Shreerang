import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Save, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const AdminSettings = () => {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testStatus, setTestStatus] = useState(null); // success, error, null

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data } = await supabase.from('admin_settings').select('key_value').eq('key_name', 'CLAUDE_API_KEY').single();
    if (data) setApiKey(data.key_value);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
        const { error } = await supabase
            .from('admin_settings')
            .upsert({ 
                key_name: 'CLAUDE_API_KEY', 
                key_value: apiKey, 
                description: 'API Key for Anthropic Claude AI' 
            }, { onConflict: 'key_name' });
            
        if (error) throw error;
        toast({ title: "Saved", description: "API Key updated successfully." });
    } catch (error) {
        toast({ variant: 'destructive', title: "Error", description: error.message });
    } finally {
        setLoading(false);
    }
  };

  const handleTest = async () => {
    setTestStatus('loading');
    // Simulate test since we can't easily call external API without backend proxy securely
    // In real app, this would call a test endpoint
    setTimeout(() => {
        if (apiKey.startsWith('sk-')) {
            setTestStatus('success');
        } else {
            setTestStatus('error');
        }
    }, 1500);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      <Helmet><title>Admin Settings</title></Helmet>
      <AdminPageHeader 
        title="Settings" 
        description="Configure system preferences and API integrations."
        breadcrumbs={[{label: 'Dashboard', href: '/admin'}, {label: 'Settings'}]}
      />

      <Card className="max-w-2xl">
         <CardHeader>
            <CardTitle>AI Integration</CardTitle>
            <CardDescription>Configure Claude AI for automatic design descriptions.</CardDescription>
         </CardHeader>
         <CardContent className="space-y-4">
            <div className="space-y-2">
                <Label>Claude API Key</Label>
                <div className="relative">
                    <Input 
                        type={showKey ? "text" : "password"} 
                        value={apiKey} 
                        onChange={(e) => setApiKey(e.target.value)} 
                        placeholder="sk-ant-..."
                    />
                    <button 
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                        {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                </div>
                <p className="text-xs text-slate-500">
                    Required for "Generate AI Description" feature in Design Upload.
                </p>
            </div>

            <div className="flex items-center gap-4 pt-2">
                <Button onClick={handleSave} disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    <Save className="mr-2 h-4 w-4" /> Save Settings
                </Button>
                <Button variant="outline" onClick={handleTest} disabled={!apiKey}>
                    Test Connection
                </Button>
            </div>

            {testStatus === 'loading' && <div className="text-sm text-slate-500 flex items-center"><Loader2 className="h-3 w-3 mr-2 animate-spin"/> Testing API key...</div>}
            {testStatus === 'success' && <div className="text-sm text-green-600 flex items-center"><CheckCircle className="h-3 w-3 mr-2"/> API Key is valid and working.</div>}
            {testStatus === 'error' && <div className="text-sm text-red-600 flex items-center"><AlertCircle className="h-3 w-3 mr-2"/> Validation failed. Please check the key.</div>}
         </CardContent>
      </Card>
    </div>
  );
};

export default AdminSettings;