import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, RefreshCw, Plus, Package, Factory, CheckCircle, TrendingDown, DollarSign, Clock } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

const STATUS_CONFIG = {
  draft:    { color: 'bg-gray-100 text-gray-700 border-gray-200',  label: 'Draft' },
  issued:   { color: 'bg-blue-100 text-blue-700 border-blue-200',   label: 'Issued to Mill' },
  received: { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', label: 'Received' },
  billed:   { color: 'bg-green-100 text-green-700 border-green-200',  label: 'Billed' },
  closed:   { color: 'bg-purple-100 text-purple-700 border-purple-200',label: 'Closed' },
};

function JobWorkCard({ job, onEdit }) {
  const isLossCritical = job.yield_loss_pct > 5;
  
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow relative">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-sm font-bold text-gray-900 font-mono">{job.lot_number}</h3>
          <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
            <Factory className="w-3 h-3" /> {job.mill_name}
          </p>
        </div>
        <Badge className={STATUS_CONFIG[job.status]?.color || 'bg-gray-100 text-gray-700 border-gray-200'}>
          {STATUS_CONFIG[job.status]?.label || job.status}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-y-3 gap-x-2 my-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-0.5">Process</p>
          <p className="text-sm font-medium text-gray-800 capitalize">{job.process_type || '—'}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-0.5">Fabric</p>
          <p className="text-sm font-medium text-gray-800 truncate" title={job.fabric_name}>{job.fabric_name || '—'}</p>
        </div>
        
        {/* Quantity Flow */}
        <div className="col-span-2 flex items-center justify-between bg-gray-50 rounded-lg p-2 border">
          <div className="text-center">
            <p className="text-[10px] text-gray-500 uppercase font-semibold">Issued</p>
            <p className="text-sm font-bold text-blue-700">{Number(job.issue_qty_mtrs||0).toLocaleString()}m</p>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center px-2">
            <img src="/assets/arrow-right.svg" alt="->" className="w-4 h-4 opacity-30" />
            <span className={`text-[10px] font-bold mt-1 px-1.5 py-0.5 rounded ${isLossCritical ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
              <TrendingDown className="w-2.5 h-2.5 inline mr-0.5" />
              {job.yield_loss_pct}% Loss
            </span>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-gray-500 uppercase font-semibold">Received</p>
            <p className="text-sm font-bold text-green-700">{Number(job.received_qty_mtrs||0).toLocaleString()}m</p>
          </div>
        </div>
        
        {/* Financials */}
        <div>
          <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold flex items-center gap-1 mb-0.5"><DollarSign className="w-3 h-3"/> Total Bill</p>
          <p className="text-sm font-bold text-gray-900">₹{(job.bill_amount||0).toLocaleString('en-IN')}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-0.5">Cost / Mtr</p>
          <p className="text-sm font-bold text-indigo-700">₹{(job.cost_per_mtr||0).toFixed(2)}</p>
        </div>
      </div>

      <div className="pt-3 border-t flex justify-between items-center text-xs text-gray-400">
        <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {new Date(job.created_at).toLocaleDateString()}</span>
        <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => onEdit(job)}>View Details</Button>
      </div>
    </div>
  );
}

export default function JobWorkJobsPage() {
  const { toast } = useToast();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => { fetchJobs(); }, []);

  async function fetchJobs() {
    setLoading(true);
    const { data, error } = await supabase
      .from('job_work_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    
    if (error) toast({ variant: 'destructive', description: error.message });
    else setJobs(data || []);
    setLoading(false);
  }

  const filtered = jobs.filter(j => 
    (!search || j.lot_number?.toLowerCase().includes(search.toLowerCase()) || j.mill_name?.toLowerCase().includes(search.toLowerCase())) &&
    (statusFilter === 'all' || j.status === statusFilter)
  );

  return (
    <div>
      <Helmet><title>Job Work Processing Lots</title></Helmet>
      <AdminPageHeader 
        title="Job Work Production Lots" 
        subtitle="End-to-end tracking: Issue → Receive → Billing → Compute Processing Cost"
        actions={
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <Plus className="w-4 h-4 mr-1"/> Create Lot
          </Button>
        }
      />
      <div className="p-6">
        <div className="flex flex-wrap gap-3 mb-6 items-center">
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search lot number or mill..." className="pl-9 bg-white" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-white border rounded-md px-3 py-2 text-sm text-gray-700">
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="issued">Issued to Mill</option>
            <option value="received">Received</option>
            <option value="billed">Billed</option>
            <option value="closed">Closed / Reconciled</option>
          </select>
          <Button variant="outline" size="icon" onClick={fetchJobs} className="bg-white"><RefreshCw className="w-4 h-4"/></Button>
        </div>

        {/* Dashboard KPI Mini Strip */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm border-l-4 border-l-blue-500">
            <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">Active Lots</p>
            <p className="text-2xl font-black mt-1 text-gray-900">{jobs.filter(j => ['issued','received'].includes(j.status)).length}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-yellow-100 shadow-sm border-l-4 border-l-yellow-500">
            <p className="text-xs text-yellow-600 font-bold uppercase tracking-wider">Avg Yield Loss</p>
            <p className="text-2xl font-black mt-1 text-gray-900">
              {(jobs.reduce((s,j)=>s+(Number(j.yield_loss_pct)||0),0) / Math.max(1, jobs.length)).toFixed(2)}%
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm border-l-4 border-l-indigo-500">
            <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider">Avg Process Cost</p>
            <p className="text-2xl font-black mt-1 text-gray-900">
              ₹{(jobs.reduce((s,j)=>s+(Number(j.cost_per_mtr)||0),0) / Math.max(1, jobs.filter(j=>j.cost_per_mtr>0).length)).toFixed(2)}
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-green-100 shadow-sm border-l-4 border-l-green-500">
            <p className="text-xs text-green-600 font-bold uppercase tracking-wider">Billed / Closed</p>
            <p className="text-2xl font-black mt-1 text-gray-900">{jobs.filter(j => ['billed','closed'].includes(j.status)).length}</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading production lots...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed flex flex-col items-center">
            <Package className="w-12 h-12 text-gray-300 mb-3" />
            <h3 className="text-lg font-medium text-gray-900">No Job Work Lots found</h3>
            <p className="text-gray-500 text-sm max-w-sm mt-1">Create a parent lot to link material outward, inward, and processing invoices together.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(job => (
              <JobWorkCard 
                key={job.id} 
                job={job} 
                onEdit={(j) => toast({ description: 'View lot details coming soon!' })} 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
