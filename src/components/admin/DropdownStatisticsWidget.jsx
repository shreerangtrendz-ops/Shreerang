import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ListChecks, Clock, Activity, Settings2, TrendingUp, Loader2 } from 'lucide-react';
import { DropdownService } from '@/services/DropdownService';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Separator } from '@/components/ui/separator';

const DropdownStatisticsWidget = ({ stats: propStats }) => {
  const [recentOptions, setRecentOptions] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const { toast } = useToast();

  const fetchRecentOptions = useCallback(async () => {
    setLoadingRecent(true);
    try {
      const data = await DropdownService.getRecentlyAddedOptions(5);
      setRecentOptions(data);
    } catch (error) {
      console.error("Error fetching recently added options:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to load recent dropdown options." });
    } finally {
      setLoadingRecent(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchRecentOptions();
  }, [fetchRecentOptions, propStats]); // Re-fetch if stats change, indicating an update

  const totalOptions = Object.values(propStats || {}).reduce((a, b) => a + b, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Options</CardTitle>
          <ListChecks className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalOptions}</div>
          <p className="text-xs text-muted-foreground">Across all categories</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Categories</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{Object.keys(propStats || {}).length}</div>
          <p className="text-xs text-muted-foreground">Unique dropdown types</p>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Recently Added Options</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {loadingRecent ? (
            <div className="flex justify-center items-center h-16"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : (
            <div className="space-y-2">
               {recentOptions.length > 0 ? (
                 recentOptions.map(opt => (
                   <div key={opt.id} className="flex justify-between text-xs items-center border-b pb-1 last:border-0 border-slate-100">
                      <span className="font-medium truncate">{opt.option_label}</span>
                      <span className="text-slate-500 ml-2 text-right">{opt.dropdown_name.replace(/_/g, ' ')}</span>
                   </div>
                 ))
               ) : (
                 <div className="text-xs text-slate-400">No recent updates</div>
               )}
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card className="md:col-span-4 bg-slate-900 text-white">
        <CardContent className="flex flex-col sm:flex-row items-center justify-between p-4">
           <div className="mb-3 sm:mb-0 text-center sm:text-left">
             <h3 className="font-bold flex items-center gap-2 text-lg">
               <Settings2 className="h-5 w-5 text-blue-300" /> Dropdown Settings
             </h3>
             <p className="text-sm text-slate-300">Manage all dropdown options in one place.</p>
           </div>
           <Link to="/admin/settings/dropdowns">
             <Button variant="secondary" size="sm" className="w-full sm:w-auto">Open Manager</Button>
           </Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default DropdownStatisticsWidget;