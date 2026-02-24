import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { HardDrive, Folder, CheckCircle, Loader2, AlertCircle, Key, Lock } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const STEPS = {
    CREDENTIALS: 1,
    AUTH: 2,
    FOLDER: 3,
    SYNC_CONFIG: 4,
    TEST: 5,
    CONFIRM: 6
};

const MOCK_FOLDERS = [
    { id: '1', name: 'Fabric Inventory', path: '/Fabric Inventory' },
    { id: '2', name: 'Design Assets', path: '/Design Assets' },
    { id: '3', name: 'Old Backups', path: '/Backups' }
];

const GoogleDriveSetupModal = ({ isOpen, onClose }) => {
    const [step, setStep] = useState(STEPS.CREDENTIALS);
    const [credentials, setCredentials] = useState({ clientId: '', clientSecret: '' });
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [selectedFolder, setSelectedFolder] = useState(null);
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const { toast } = useToast();

    const handleAuth = () => {
        // Simulate OAuth window
        const width = 500;
        const height = 600;
        
        // In a real app, this would redirect to Google's OAuth endpoint
        setIsTesting(true);
        setTimeout(() => {
            setIsTesting(false);
            setIsAuthenticated(true);
            toast({ title: 'Authenticated', description: 'Successfully connected to Google Account' });
            setStep(STEPS.FOLDER);
        }, 1500);
    };

    const handleTest = () => {
        setIsTesting(true);
        setTimeout(() => {
            setIsTesting(false);
            setTestResult('success');
        }, 2000);
    };

    const handleSave = () => {
        toast({ title: 'Setup Complete', description: 'Google Drive integration is active.' });
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl h-[650px] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Setup Google Drive Integration</DialogTitle>
                    <DialogDescription>
                        {step === STEPS.CREDENTIALS && "Step 1: Configure API Credentials"}
                        {step === STEPS.AUTH && "Step 2: Authorize Access"}
                        {step === STEPS.FOLDER && "Step 3: Select Source Folder"}
                        {step === STEPS.SYNC_CONFIG && "Step 4: Configure Sync Settings"}
                        {step === STEPS.TEST && "Step 5: Verify Connection"}
                        {step === STEPS.CONFIRM && "Step 6: Review & Save"}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 py-4 px-2 overflow-y-auto">
                    {step === STEPS.CREDENTIALS && (
                        <div className="space-y-6">
                            <div className="bg-blue-50 p-4 rounded-lg flex items-start gap-3">
                                <Key className="h-5 w-5 text-blue-600 mt-0.5" />
                                <div className="text-sm text-blue-800">
                                    <p className="font-medium">Bring Your Own Keys</p>
                                    <p className="mt-1">To ensure full control and security, please provide your own Google Cloud Console credentials. You need to enable the Google Drive API in your project.</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Client ID</Label>
                                    <Input 
                                        placeholder="e.g., 123456789-abc...apps.googleusercontent.com" 
                                        value={credentials.clientId}
                                        onChange={(e) => setCredentials({...credentials, clientId: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Client Secret</Label>
                                    <div className="relative">
                                        <Input 
                                            type="password" 
                                            placeholder="e.g., GOCSPX-..." 
                                            value={credentials.clientSecret}
                                            onChange={(e) => setCredentials({...credentials, clientSecret: e.target.value})}
                                        />
                                        <Lock className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === STEPS.AUTH && (
                        <div className="flex flex-col items-center justify-center h-full space-y-6">
                            <div className="bg-blue-50 p-6 rounded-full">
                                <HardDrive className="h-12 w-12 text-blue-600" />
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="font-medium text-lg">Connect Google Drive</h3>
                                <p className="text-sm text-slate-500 max-w-xs mx-auto">
                                    We will now redirect you to Google to authorize access using the credentials provided.
                                </p>
                            </div>
                            <Button onClick={handleAuth} disabled={isTesting} className="w-full max-w-xs gap-2">
                                {isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" className="w-4 h-4" alt="G" />
                                )}
                                {isTesting ? 'Connecting...' : 'Sign in with Google'}
                            </Button>
                        </div>
                    )}

                    {step === STEPS.FOLDER && (
                        <div className="space-y-4">
                            <Label>Select a folder to sync:</Label>
                            <ScrollArea className="h-[300px] border rounded-md p-2">
                                {MOCK_FOLDERS.map(folder => (
                                    <div 
                                        key={folder.id}
                                        onClick={() => setSelectedFolder(folder)}
                                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${selectedFolder?.id === folder.id ? 'bg-blue-50 border-blue-200 border' : 'hover:bg-slate-50'}`}
                                    >
                                        <Folder className={`h-5 w-5 ${selectedFolder?.id === folder.id ? 'text-blue-600' : 'text-slate-400'}`} />
                                        <div className="flex-1">
                                            <div className="font-medium text-sm">{folder.name}</div>
                                            <div className="text-xs text-slate-400">{folder.path}</div>
                                        </div>
                                        {selectedFolder?.id === folder.id && <CheckCircle className="h-4 w-4 text-blue-600" />}
                                    </div>
                                ))}
                            </ScrollArea>
                        </div>
                    )}

                    {step === STEPS.SYNC_CONFIG && (
                        <div className="space-y-6 p-2">
                            <div className="space-y-4 border rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="auto-sync">Auto-sync on schedule</Label>
                                    <Checkbox id="auto-sync" defaultChecked />
                                </div>
                                <div className="space-y-2">
                                    <Label>Sync Frequency</Label>
                                    <Select defaultValue="daily">
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="hourly">Every Hour</SelectItem>
                                            <SelectItem value="daily">Daily</SelectItem>
                                            <SelectItem value="weekly">Weekly</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            
                            <div className="space-y-4 border rounded-lg p-4">
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="create-structure" defaultChecked />
                                    <Label htmlFor="create-structure">Mirror folder structure in Fabric Master</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="auto-create" />
                                    <Label htmlFor="auto-create">Auto-create missing design records</Label>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === STEPS.TEST && (
                        <div className="flex flex-col items-center justify-center h-full space-y-6">
                            {!testResult ? (
                                <>
                                    <Button size="lg" onClick={handleTest} disabled={isTesting}>
                                        {isTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        {isTesting ? 'Testing Connection...' : 'Test Connection'}
                                    </Button>
                                    <p className="text-sm text-slate-500">We will verify read access to the selected folder.</p>
                                </>
                            ) : (
                                <div className="text-center space-y-4 animate-in zoom-in">
                                    <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                                        <CheckCircle className="h-8 w-8 text-green-600" />
                                    </div>
                                    <h3 className="font-bold text-xl text-green-700">Connection Successful</h3>
                                    <p className="text-slate-600">Successfully accessed 3 folders and 15 files.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {step === STEPS.CONFIRM && (
                        <div className="space-y-6">
                            <div className="bg-slate-50 p-6 rounded-lg space-y-4">
                                <div className="flex justify-between border-b pb-2">
                                    <span className="text-slate-500 text-sm">Client ID</span>
                                    <span className="font-medium text-sm truncate max-w-[200px]">{credentials.clientId}</span>
                                </div>
                                <div className="flex justify-between border-b pb-2">
                                    <span className="text-slate-500 text-sm">Folder</span>
                                    <span className="font-medium text-sm">{selectedFolder?.path}</span>
                                </div>
                                <div className="flex justify-between border-b pb-2">
                                    <span className="text-slate-500 text-sm">Schedule</span>
                                    <span className="font-medium text-sm">Daily</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500 text-sm">Status</span>
                                    <span className="font-medium text-sm text-green-600 flex items-center gap-1"><CheckCircle className="h-3 w-3"/> Verified</span>
                                </div>
                            </div>
                            <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Ready to Sync</AlertTitle>
                                <AlertDescription>Initial sync may take a few minutes depending on folder size.</AlertDescription>
                            </Alert>
                        </div>
                    )}
                </div>

                <DialogFooter className="border-t pt-4">
                    {step > 1 && <Button variant="outline" onClick={() => setStep(s => s - 1)}>Back</Button>}
                    
                    {step === STEPS.CREDENTIALS && <Button disabled={!credentials.clientId || !credentials.clientSecret} onClick={() => setStep(STEPS.AUTH)}>Next</Button>}
                    {/* Auth step handles next automatically on success */}
                    {step === STEPS.FOLDER && <Button disabled={!selectedFolder} onClick={() => setStep(STEPS.SYNC_CONFIG)}>Next</Button>}
                    {step === STEPS.SYNC_CONFIG && <Button onClick={() => setStep(STEPS.TEST)}>Next</Button>}
                    {step === STEPS.TEST && <Button disabled={!testResult} onClick={() => setStep(STEPS.CONFIRM)}>Next</Button>}
                    {step === STEPS.CONFIRM && <Button onClick={handleSave}>Save & Sync</Button>}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default GoogleDriveSetupModal;