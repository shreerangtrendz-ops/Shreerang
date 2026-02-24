
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Activity, RefreshCw, Search, Download, Filter, User, Clock, AlertCircle, CheckCircle, Info } from 'lucide-react';

const ACTION_COLORS = {
  INSERT: 'bg-green-100 text-green-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
  LOGIN: 'bg-purple-100 text-purple-700',
  LOGOUT: 'bg-gray-100 text-gray-700',
  ERROR: 'bg-red-100 text-red-800',
};

const ACTION_ICONS = {
  INSERT: CheckCircle,
  UPDATE: Info,
  DELETE: AlertCircle,
  ERROR: AlertCircle,
};

export default function ActivityLogsPage() {
  const { toast } = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('ALL');
  const [filterTable, setFilterTable] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('system_activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      const { data, error } = await query;
      if (error) throw error;
      setLogs(data || []);
    } catch (e) {
      toast({ title: 'Failed to load activity logs', variant: 'destructive' });
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => { fetchLogs(); }, []);

  const uniqueTables = ['ALL', ...new Set(logs.map(l => l.table_name).filter(Boolean))];
  const uniqueActions = ['ALL', 'INSERT', 'UPDATE', 'DELETE', 'LOGIN', 'ERROR'];

  const filtered = logs.filter(log => {
    const matchSearch = !search ||
      (log.table_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (log.user_email || '').toLowerCase().includes(search.toLowerCase()) ||
      (log.action || '').toLowerCase().includes(search.toLowerCase()) ||
      (log.description || '').toLowerCase().includes(search.toLowerCase());
    const matchAction = filterAction === 'ALL' || log.action === filterAction;
    const matchTable = filterTable === 'ALL' || log.table_name === filterTable;
    const logDate = log.created_at ? new Date(log.created_at) : null;
    const matchFrom = !dateFrom || (logDate && logDate >= new Date(dateFrom));
    const matchTo = !dateTo || (logDate && logDate <= new Date(dateTo + 'T23:59:59'));
    return matchSearch && matchAction && matchTable && matchFrom && matchTo;
  });

  const stats = {
    total: logs.length,
    inserts: logs.filter(l => l.action === 'INSERT').length,
    updates: logs.filter(l => l.action === 'UPDATE').length,
    deletes: logs.filter(l => l.action === 'DELETE').length,
    errors: logs.filter(l => l.action === 'ERROR').length,
    today: logs.filter(l => l.created_at && new Date(l.created_at).toDateString() === new Date().toDateString()).length,
  };

  const exportCSV = () => {
    if (filtered.length === 0) { toast({ title: 'No logs to export' }); return; }
    const headers = ['Date', 'Time', 'Action', 'Table', 'User', 'Description', 'Record ID'];
    const rows = filtered.map(l => {
      const dt = l.created_at ? new Date(l.created_at) : null;
      return [
        dt ? dt.toLocaleDateString('en-IN') : '',
        dt ? dt.toLocaleTimeString('en-IN') : '',
        l.action || '', l.table_name || '', l.user_email || '',
        l.description || '', l.record_id || ''
      ];
    });
    const csv = [headers, ...rows].map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = 'activity_logs_' + new Date().toISOString().slice(0,10) + '.csv';
    a.click(); URL.revokeObjectURL(url);
    toast({ title: 'Exported ' + filtered.length + ' logs' });
  };

  const getActionColor = (action) => ACTION_COLORS[action] || 'bg-gray-100 text-gray-600';
  const getActionIcon = (action) => {
    const Icon = ACTION_ICONS[action] || Activity;
    return <Icon className="w-3 h-3" />;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="w-6 h-6 text-blue-600" /> Activity Logs
          </h1>
          <p className="text-gray-500 text-sm mt-1">Track all admin actions and system events</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={'w-4 h-4 mr-2 ' + (loading ? 'animate-spin' : '')} />
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
          <Button onClick={exportCSV} className="bg-green-600 hover:bg-green-700 text-white">
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-4">
        <Card className="text-center p-3">
          <div className="text-2xl font-bold text-blue-700">{stats.total}</div>
          <div className="text-xs text-gray-500 mt-1">Total Logs</div>
        </Card>
        <Card className="text-center p-3">
          <div className="text-2xl font-bold text-green-600">{stats.inserts}</div>
          <div className="text-xs text-gray-500 mt-1">Inserts</div>
        </Card>
        <Card className="text-center p-3">
          <div className="text-2xl font-bold text-blue-600">{stats.updates}</div>
          <div className="text-xs text-gray-500 mt-1">Updates</div>
        </Card>
        <Card className="text-center p-3">
          <div className="text-2xl font-bold text-red-600">{stats.deletes}</div>
          <div className="text-xs text-gray-500 mt-1">Deletes</div>
        </Card>
        <Card className="text-center p-3">
          <div className="text-2xl font-bold text-red-800">{stats.errors}</div>
          <div className="text-xs text-gray-500 mt-1">Errors</div>
        </Card>
        <Card className="text-center p-3">
          <div className="text-2xl font-bold text-purple-600">{stats.today}</div>
          <div className="text-xs text-gray-500 mt-1">Today</div>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Filter className="w-4 h-4" /> Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search logs..." className="pl-9" />
            </div>
            <div>
              <select value={filterAction} onChange={e => setFilterAction(e.target.value)}
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                {uniqueActions.map(a => <option key={a} value={a}>{a === 'ALL' ? 'All Actions' : a}</option>)}
              </select>
            </div>
            <div>
              <select value={filterTable} onChange={e => setFilterTable(e.target.value)}
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                {uniqueTables.map(t => <option key={t} value={t}>{t === 'ALL' ? 'All Tables' : t}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="text-sm" />
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="text-sm" />
            </div>
          </div>
          {(search || filterAction !== 'ALL' || filterTable !== 'ALL' || dateFrom || dateTo) && (
            <div className="flex items-center gap-2 mt-3">
              <span className="text-sm text-gray-500">Showing {filtered.length} of {logs.length} logs</span>
              <Button variant="outline" size="sm" onClick={() => { setSearch(''); setFilterAction('ALL'); setFilterTable('ALL'); setDateFrom(''); setDateTo(''); }}>
                Clear Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            Activity Timeline ({filtered.length} entries)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-500 mr-2" />
              <span className="text-gray-500">Loading activity logs...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No activity logs found</p>
              <p className="text-sm mt-1">Try adjusting your filters or check back later</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-2 px-3 font-semibold text-gray-600">Date & Time</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-600">Action</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-600">Table</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-600">User</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-600">Description</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-600">Record ID</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((log, i) => {
                    const dt = log.created_at ? new Date(log.created_at) : null;
                    const isToday = dt && dt.toDateString() === new Date().toDateString();
                    return (
                      <tr key={i} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-gray-400 shrink-0" />
                            <div>
                              <div className={'text-xs font-medium ' + (isToday ? 'text-blue-600' : 'text-gray-700')}>
                                {dt ? dt.toLocaleDateString('en-IN') : '-'}
                              </div>
                              <div className="text-xs text-gray-400">
                                {dt ? dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <Badge className={'text-xs flex items-center gap-1 w-fit ' + getActionColor(log.action)}>
                            {getActionIcon(log.action)}
                            {log.action || '-'}
                          </Badge>
                        </td>
                        <td className="py-2 px-3">
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-mono">
                            {log.table_name || '-'}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3 h-3 text-gray-400 shrink-0" />
                            <span className="text-xs text-gray-700 truncate max-w-[120px]">
                              {log.user_email || log.user_id || 'System'}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <span className="text-xs text-gray-600 line-clamp-2 max-w-[250px]">
                            {log.description || log.changes || '-'}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <span className="text-xs text-gray-400 font-mono">
                            {log.record_id ? String(log.record_id).slice(0, 8) + '...' : '-'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
