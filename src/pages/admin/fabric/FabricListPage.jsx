import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, ChevronDown, ChevronRight, Layers, Edit2 } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const FabricListPage = () => {
  const navigate = useNavigate();
  const [baseFabrics, setBaseFabrics] = useState([]);
  const [finishFabrics, setFinishFabrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSections, setExpandedSections] = useState({});

  useEffect(() => {
    fetchFabrics();
  }, []);

  const fetchFabrics = async () => {
    setLoading(true);
    // Fetch Base Fabrics
    const { data: baseData } = await supabase.from('base_fabrics').select('*').order('base_fabric_name');
    // Fetch Finish Fabrics
    const { data: finishData } = await supabase.from('finish_fabrics').select('*').order('finish_fabric_name');
    
    setBaseFabrics(baseData || []);
    setFinishFabrics(finishData || []);
    setLoading(false);
  };

  const toggleSection = (id) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredBaseFabrics = baseFabrics.filter(b => 
    b.base_fabric_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getFinishFabricsForBase = (baseId) => {
      return finishFabrics.filter(f => f.base_fabric_id === baseId);
  };

  if (loading) return <LoadingSpinner fullHeight />;

  return (
    <div className="space-y-6">
      <Helmet><title>Fabric Master</title></Helmet>

      <AdminPageHeader 
          title="Fabric Master" 
          breadcrumbs={[{label: 'Dashboard', href: '/admin'}, {label: 'Fabric Master'}]}
      />

      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
                placeholder="Search base fabrics..." 
                className="pl-9" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
            />
        </div>
        <Button onClick={() => navigate('/admin/fabric-master/new')} className="gap-2">
            <Plus className="h-4 w-4" /> Create Base Fabric
        </Button>
      </div>

      <div className="space-y-4">
        {filteredBaseFabrics.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed">
                <Layers className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <p className="text-muted-foreground">No fabrics found. Create your first base fabric.</p>
            </div>
        ) : (
            filteredBaseFabrics.map(base => {
                const childFabrics = getFinishFabricsForBase(base.id);
                const isExpanded = expandedSections[base.id];
                
                return (
                    <Card key={base.id} className="overflow-hidden">
                        <Collapsible open={isExpanded} onOpenChange={() => toggleSection(base.id)}>
                            <div className="flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-4 flex-1">
                                    <CollapsibleTrigger asChild>
                                        <Button variant="ghost" size="sm" className="p-0 hover:bg-transparent">
                                            {isExpanded ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
                                        </Button>
                                    </CollapsibleTrigger>
                                    <div>
                                        <h3 className="font-semibold text-lg flex items-center gap-2">
                                            {base.base_fabric_name}
                                            <Badge variant="outline" className="text-xs font-normal">Base</Badge>
                                        </h3>
                                        <div className="text-xs text-muted-foreground flex gap-4 mt-1">
                                            <span>HSN: {base.hsn_code || 'N/A'}</span>
                                            <span>Width: {base.width || '-'}</span>
                                            <span>GSM: {base.gsm || '-'}</span>
                                            <span>{childFabrics.length} Finish Fabrics</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                     <Button size="sm" variant="outline" onClick={() => navigate(`/admin/fabric-master/${base.id}/new-finish`)} className="hidden sm:flex">
                                        <Plus className="h-3 w-3 mr-1" /> Add Finish
                                     </Button>
                                     <Button size="icon" variant="ghost" onClick={() => navigate(`/admin/fabric-master/${base.id}`)}>
                                        <Edit2 className="h-4 w-4 text-slate-500" />
                                     </Button>
                                </div>
                            </div>

                            <CollapsibleContent>
                                <div className="border-t bg-slate-50/50 p-4 space-y-2">
                                    {childFabrics.length === 0 ? (
                                        <p className="text-sm text-muted-foreground italic pl-8">No finish fabrics added yet.</p>
                                    ) : (
                                        <div className="grid gap-2">
                                            {childFabrics.map(finish => (
                                                <div key={finish.id} className="flex items-center justify-between p-3 bg-white border rounded-md shadow-sm ml-8">
                                                    <div>
                                                        <h4 className="font-medium text-sm flex items-center gap-2">
                                                            {finish.finish_fabric_name}
                                                            <Badge variant="secondary" className="text-[10px] h-5">{finish.class}</Badge>
                                                        </h4>
                                                        <p className="text-xs text-muted-foreground mt-0.5">
                                                            {finish.process} • {finish.process_type} • {finish.tag}
                                                        </p>
                                                    </div>
                                                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => navigate(`/admin/fabric-master/finish/${finish.id}`)}>
                                                        <Edit2 className="h-3.5 w-3.5 text-slate-400" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </CollapsibleContent>
                        </Collapsible>
                    </Card>
                );
            })
        )}
      </div>
    </div>
  );
};

export default FabricListPage;