import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';

const WhatsAppTemplateForm = () => {
    const [name, setName] = useState('');
    const [body, setBody] = useState('');
    const [params, setParams] = useState([]);

    const addParam = () => setParams([...params, { name: '', type: 'text' }]);
    const removeParam = (idx) => setParams(params.filter((_, i) => i !== idx));

    return (
        <Card>
            <CardHeader>
                <CardTitle>Create Message Template</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label>Template Name (lowercase, no spaces)</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. order_confirmation" />
                </div>

                <div className="space-y-2">
                    <Label>Template Body</Label>
                    <Textarea 
                        value={body} 
                        onChange={(e) => setBody(e.target.value)} 
                        placeholder="Hi {{1}}, your order {{2}} is confirmed." 
                        className="h-32"
                    />
                    <p className="text-xs text-muted-foreground">Use {"{{number}}"} for variables.</p>
                </div>

                <div className="space-y-2">
                    <Label>Variables Mapping</Label>
                    {params.map((p, i) => (
                        <div key={i} className="flex gap-2">
                            <span className="flex items-center px-3 bg-slate-100 rounded text-sm text-slate-500">{`{{${i+1}}}`}</span>
                            <Input placeholder="Parameter Name" className="flex-1" />
                            <Button variant="ghost" size="icon" onClick={() => removeParam(i)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                        </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={addParam} className="mt-2">
                        <Plus className="h-3 w-3 mr-2" /> Add Variable
                    </Button>
                </div>

                <div className="pt-4 border-t flex justify-end gap-2">
                    <Button variant="outline">Cancel</Button>
                    <Button>Submit for Review</Button>
                </div>
            </CardContent>
        </Card>
    );
};

export default WhatsAppTemplateForm;