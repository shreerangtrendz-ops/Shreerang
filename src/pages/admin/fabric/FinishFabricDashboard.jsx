import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FinishFabricService, PROCESS_PATHS } from '@/services/FinishFabricService';
import { useToast } from '@/components/ui/use-toast';

const C = {
  teal: '#2BA898', tealDark: '#0B2E2B', gold: '#D4920A',
  surface: '#fff', surface2: '#EEF8F6', border: '#D6EEE9',
  text: '#0D2E2B', muted: '#4A7A74', red: '#D93A3A',
  green: '#1E9E5A', orange: '#C86020',
};

export default function FinishFabricDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [fabrics, setFabrics]   = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [filterProcess, setFilterProcess] = useState('all');
  const [filterTally, setFilterTally]     = useState('all');
  const [filterStatus, setFilterStatus]   = useState('all');
  const [retrying, setRetrying]           = useState(null);

  useEffect(() => { load(); }, []);

  useEffect(() => {
    let r = [...fabrics];
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(f =>
        f.finish_fabric_name?.toLowerCase().includes(q) ||
        f.base_fabrics?.base_fabric_name?.toLowerCase().includes(q) ||
        f.process_type?.toLowerCase().includes(q)
      );
    }
    if (filterProcess !== 'all') r = r.filter(f => f.process_type === filterProcess || f.process_path === filterProcess);
    if (filterTally === 'synced')   r = r.filter(f => f.tally_synced);
    if (filterTally === 'unsynced') r = r.filter(f => !f.tally_synced);
    if (filterStatus !== 'all') r = r.filter(f => f.status === filterStatus);
    setFiltered(r);
  }, [fabrics, search, filterProcess, filterTally, filterStatus]);

  const load = async () => {
    setLoading(true);
    try {
      setFabrics(await FinishFabricService.getAll() || []);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Load failed', description: e.message });
    } finally { setLoading(false); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try {
      await FinishFabricService.update(id, { status: 'deleted' });
      toast({ title: 'Deleted' });
      load();
    } catch (e) { toast({ variant: 'destructive', title: 'Delete failed', description: e.message }); }
  };

  const handleRetryTally = async (fabric) => {
    setRetrying(fabric.id);
    try {
      const tr = await FinishFabricService.pushToTally({
        itemName:   fabric.finish_fabric_name,
        tallyGroup: fabric.tally_group || 'Finish Fabrics',
        hsnCode:    fabric.hsn_code,
        gstRate:    fabric.gst_rate,
      });
      if (tr.success) {
        await FinishFabricService.markTallySynced(fabric.id, fabric.finish_fabric_name);
        toast({ title: 'Tally synced', description: `"${fabric.finish_fabric_name}" created in Tally.` });
        load();
      } else {
        toast({ variant: 'destructive', title: 'Tally push failed', description: tr.error || 'Check Tally is open' });
      }
    } catch (e) {
      toast({ variant: 'destructive', title: 'Tally push error', description: e.message });
    } finally { setRetrying(null); }
  };

  const total    = fabrics.length;
  const synced   = fabrics.filter(f => f.tally_synced).length;
  const unsynced = total - synced;

  return (
    <div style={{ minHeight: '100vh', background: C.surface2, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ background: C.tealDark, color: '#fff', padding: '16px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, opacity: .6, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Fabric Master</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>Finish Fabrics</div>
        </div>
        <button onClick={() => navigate('/admin/fabric/finish/new')}
          style={{ background: C.teal, border: 'none', borderRadius: 8, color: '#fff', padding: '9px 22px', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
          + Add Finish Fabric
        </button>
      </div>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 20px' }}>
        <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
          <KPI label="Total" value={total} color={C.teal} />
          <KPI label="Synced to Tally" value={synced} color={C.green} />
          <KPI label="Not in Tally" value={unsynced} color={C.orange} />
          <KPI label="Active" value={fabrics.filter(f => f.status === 'active').length} color={C.teal} />
        </div>

        <div style={{ background: C.surface, borderRadius: 10, border: `1px solid ${C.border}`, padding: '14px 18px', marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <input style={{ ...inputStyle, minWidth: 220 }} placeholder="Search name, base fabric..." value={search} onChange={e => setSearch(e.target.value)} />
          <select style={selectStyle} value={filterProcess} onChange={e => setFilterProcess(e.target.value)}>
            <option value="all">All Processes</option>
            {PROCESS_PATHS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <select style={selectStyle} value={filterTally} onChange={e => setFilterTally(e.target.value)}>
            <option value="all">All Tally Status</option>
            <option value="synced">Synced to Tally</option>
            <option value="unsynced">Not in Tally</option>
          </select>
          <select style={selectStyle} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: C.muted }}>{filtered.length} records</span>
        </div>

        <div style={{ background: C.surface, borderRadius: 10, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: C.muted }}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: C.muted }}>
              No finish fabrics found.{' '}
              <span style={{ color: C.teal, cursor: 'pointer', fontWeight: 600 }} onClick={() => navigate('/admin/fabric/finish/new')}>Create the first one</span>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: C.surface2, borderBottom: `2px solid ${C.border}` }}>
                  {['Finish Fabric Name', 'Base Fabric', 'Process', 'Width', 'Tag', 'Tally Status', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', color: C.muted, letterSpacing: .5 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((fab, i) => (
                  <tr key={fab.id} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? C.surface : '#fafffe' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: C.text }}>
                      {fab.finish_fabric_name}
                      {fab.design_image_url && <span style={{ marginLeft: 6, fontSize: 11, color: C.gold }}>IMG</span>}
                    </td>
                    <td style={{ padding: '10px 14px', color: C.muted }}>{fab.base_fabrics?.base_fabric_name || '-'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ background: C.surface2, borderRadius: 6, padding: '2px 8px', fontSize: 11, color: C.teal, fontWeight: 600 }}>
                        {PROCESS_PATHS.find(p => p.value === (fab.process_type || fab.process_path))?.label || fab.process_type || '-'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', color: C.muted }}>{fab.finish_width ? `${fab.finish_width}"` : '-'}</td>
                    <td style={{ padding: '10px 14px', color: C.muted }}>{fab.tag || '-'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      {fab.tally_synced ? (
                        <span style={{ background: '#d4edda', color: C.green, borderRadius: 10, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>Synced</span>
                      ) : (
                        <button onClick={() => handleRetryTally(fab)} disabled={retrying === fab.id}
                          style={{ background: '#fff3cd', color: C.orange, border: `1px solid ${C.orange}55`, borderRadius: 10, padding: '3px 10px', fontSize: 11, fontWeight: 600, cursor: retrying === fab.id ? 'wait' : 'pointer' }}>
                          {retrying === fab.id ? 'Pushing...' : 'Push to Tally'}
                        </button>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ background: fab.status === 'active' ? '#d4edda' : '#f8d7da', color: fab.status === 'active' ? C.green : C.red, borderRadius: 10, padding: '3px 10px', fontSize: 11, fontWeight: 600, textTransform: 'capitalize' }}>
                        {fab.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <ActionBtn onClick={() => navigate(`/admin/fabric/finish/${fab.id}/edit`)} color={C.teal}>Edit</ActionBtn>
                        <ActionBtn onClick={() => handleDelete(fab.id, fab.finish_fabric_name)} color={C.red}>Del</ActionBtn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function KPI({ label, value, color }) {
  return (
    <div style={{ background: C.surface, borderRadius: 10, border: `1px solid ${C.border}`, padding: '14px 20px', minWidth: 120 }}>
      <div style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: C.muted, marginTop: 4, fontWeight: 600, textTransform: 'uppercase' }}>{label}</div>
    </div>
  );
}

function ActionBtn({ onClick, color, children }) {
  return (
    <button onClick={onClick} style={{ background: color + '18', color, border: `1px solid ${color}44`, borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
      {children}
    </button>
  );
}

const inputStyle = { border: `1px solid ${C.border}`, borderRadius: 7, padding: '7px 12px', fontSize: 13, outline: 'none', background: '#fff', color: C.text };
const selectStyle = { ...inputStyle, cursor: 'pointer' };
