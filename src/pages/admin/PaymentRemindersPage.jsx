import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/lib/supabase';
import { ensureArray } from '@/lib/arrayValidation';
import { useToast } from '@/components/ui/use-toast';

const fmtDate = (d) => { if (!d) return '—'; return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }); };
const daysDiff = (d) => { if (!d) return 0; return Math.floor((Date.now() - new Date(d).getTime()) / 86400000); };

const PaymentRemindersPage = () => {
    const { toast } = useToast();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState({});

    const load = async () => {
        setLoading(true);
        try {
            // Fetch unpaid / overdue orders
            const { data, error } = await supabase
                .from('sales_orders')
                .select('id, order_number, customer_name, phone, final_amount, payment_status, due_date, created_at, outstanding_amount')
                .in('payment_status', ['pending', 'overdue', 'partial'])
                .order('due_date', { ascending: true })
                .limit(200);
            if (error) throw error;
            setOrders(ensureArray(data));
        } catch (e) {
            console.error(e);
            setOrders([]);
        } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const getDaysOverdue = (due) => {
        if (!due) return 0;
        return daysDiff(due);
    };

    const sendReminder = async (order) => {
        setSending(s => ({ ...s, [order.id]: true }));
        try {
            const phone = (order.phone || '').replace(/\D/g, '');
            const amount = order.outstanding_amount || order.final_amount;
            const msg = `Dear ${order.customer_name}, your payment of ₹${Number(amount).toLocaleString()} against invoice ${order.order_number} is overdue. Kindly arrange payment at your earliest. — Shreerang Trendz`;
            const waUrl = `https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`;
            window.open(waUrl, '_blank');
            toast({ description: `WhatsApp opened for ${order.customer_name}` });
        } catch (e) {
            toast({ variant: 'destructive', description: e.message });
        } finally {
            setSending(s => ({ ...s, [order.id]: false }));
        }
    };

    const sendBulkReminders = () => {
        const overdue = orders.filter(o => o.payment_status === 'overdue' || getDaysOverdue(o.due_date) > 0);
        overdue.slice(0, 5).forEach((o, i) => {
            setTimeout(() => sendReminder(o), i * 1000);
        });
    };

    const totalOutstanding = orders.reduce((s, o) => s + (parseFloat(o.outstanding_amount || o.final_amount) || 0), 0);
    const overdueCount = orders.filter(o => getDaysOverdue(o.due_date) > 0).length;

    return (
        <div className="screen active">
            <Helmet><title>Payment Reminders — Shreerang Admin</title></Helmet>
            <div className="topbar">
                <div>
                    <div className="page-title">Payment Reminders</div>
                    <div className="breadcrumb">Smart Features → Overdue Payments · {overdueCount} overdue</div>
                </div>
                <div className="topbar-right">
                    <span className="badge bred">{overdueCount} Overdue</span>
                    <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--red)' }}>₹{(totalOutstanding / 1000).toFixed(0)}K pending</span>
                    <button className="btn btn-gold" onClick={sendBulkReminders}>📲 Bulk WA Reminders</button>
                </div>
            </div>

            <div className="content">
                <div className="alert a-warn">
                    ⚠️ Bulk reminder sends WhatsApp to top 5 overdue customers. Individual "Send WA" opens WhatsApp with pre-filled message. <b>Actual API sending requires Meta WhatsApp integration.</b>
                </div>

                {/* KPIs */}
                <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 16 }}>
                    {[
                        { label: 'Total Pending', value: `₹${(totalOutstanding / 1000).toFixed(1)}K`, color: 'var(--red)' },
                        { label: 'Overdue Orders', value: overdueCount, color: 'var(--orange)' },
                        { label: 'Pending Payment', value: orders.filter(o => o.payment_status === 'pending').length, color: 'var(--blue)' },
                        { label: 'Partial Paid', value: orders.filter(o => o.payment_status === 'partial').length, color: 'var(--purple)' },
                    ].map((k, i) => (
                        <div className="kpi-card" key={i}>
                            <div className="kpi-label">{k.label}</div>
                            <div className="kpi-value" style={{ color: k.color, fontSize: 22 }}>{loading ? '—' : k.value}</div>
                        </div>
                    ))}
                </div>

                <div className="card">
                    <div className="card-header">
                        <div className="card-title">Outstanding Payments</div>
                        <button className="btn btn-outline btn-sm" onClick={load}>↻ Refresh</button>
                    </div>
                    <div className="tbl">
                        <table>
                            <thead>
                                <tr>
                                    <th>Order</th>
                                    <th>Customer</th>
                                    <th>Amount</th>
                                    <th>Due Date</th>
                                    <th>Days Overdue</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading orders…</td></tr>
                                ) : orders.length === 0 ? (
                                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--green)' }}>🎉 All payments collected!</td></tr>
                                ) : (
                                    orders.map((o, i) => {
                                        const days = getDaysOverdue(o.due_date);
                                        return (
                                            <tr key={o.id || i} style={{ background: days > 30 ? 'rgba(217,58,58,0.03)' : '' }}>
                                                <td><span className="mono" style={{ color: 'var(--teal)', fontWeight: 600 }}>{o.order_number}</span></td>
                                                <td>
                                                    <div style={{ fontWeight: 600, fontSize: 12 }}>{o.customer_name}</div>
                                                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{o.phone}</div>
                                                </td>
                                                <td className="mono" style={{ fontWeight: 700, color: 'var(--red)' }}>₹{Number(o.outstanding_amount || o.final_amount || 0).toLocaleString()}</td>
                                                <td className="mono">{fmtDate(o.due_date)}</td>
                                                <td>
                                                    {days > 0 ? (
                                                        <span style={{ color: days > 30 ? 'var(--red)' : 'var(--orange)', fontWeight: 700, fontSize: 13 }}>{days}d</span>
                                                    ) : <span style={{ color: 'var(--green)' }}>On time</span>}
                                                </td>
                                                <td>
                                                    {o.payment_status === 'overdue' ? <span className="badge bred">Overdue</span>
                                                        : o.payment_status === 'partial' ? <span className="badge bpurp">Partial</span>
                                                            : <span className="badge borg">Pending</span>}
                                                </td>
                                                <td>
                                                    <button
                                                        className="btn btn-sm"
                                                        style={{ background: 'var(--green)', color: '#fff', padding: '4px 10px', borderRadius: 4, border: 'none', fontSize: 11, cursor: 'pointer' }}
                                                        onClick={() => sendReminder(o)}
                                                        disabled={sending[o.id]}
                                                    >
                                                        {sending[o.id] ? '…' : '📲 Send WA'}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentRemindersPage;
