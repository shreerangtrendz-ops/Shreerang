import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Loader2, AlertCircle, TrendingDown, IndianRupee } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// ============================================================
// Customer Portal — Outstanding Balance
// Route: /customer/outstanding
// Reads from outstanding_receivable view (already exists in DB)
// Synced from Tally via syncOutstandingFromTally()
// ============================================================

export default function CustomerOutstanding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [outstanding, setOutstanding] = useState([]);
  const [customer, setCustomer] = useState(null);

  useEffect(() => {
    if (!user) { navigate('/customer/login'); return; }
    loadOutstanding();
  }, [user]);

  const loadOutstanding = async () => {
    setLoading(true);
    try {
      const { data: cust } = await supabase
        .from('customers')
        .select('id, customer_name, tally_ledger_name, credit_limit')
        .eq('login_email', user.email)
        .single();

      if (!cust) { setLoading(false); return; }
      setCustomer(cust);

      // Try to load from outstanding_receivable view (Tally-synced)
      const { data: outData } = await supabase
        .from('outstanding_receivable')
        .select('*')
        .ilike('party_name', `%${cust.tally_ledger_name || cust.customer_name}%`);

      setOutstanding(outData || []);
    } catch (err) {
      console.error('CustomerOutstanding load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatAmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
  const totalDue = outstanding.reduce((s, r) => s + Number(r.balance_due || 0), 0);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <>
      <Helmet><title>Outstanding Balance — Shreerang Trendz</title></Helmet>
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>Outstanding Balance</h1>
          <p className="text-muted-foreground text-sm mb-6">Synced from Tally · {customer?.tally_ledger_name || customer?.customer_name}</p>

          {/* Summary Card */}
          <Card className="mb-6 border-l-4 border-l-amber-500">
            <CardContent className="pt-6 pb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Outstanding</p>
                  <p className="text-3xl font-bold text-amber-600 mt-1">{formatAmt(totalDue)}</p>
                </div>
                <IndianRupee className="h-10 w-10 text-amber-400" />
              </div>
              {customer?.credit_limit > 0 && (
                <p className="text-xs text-muted-foreground mt-3">Credit Limit: {formatAmt(customer.credit_limit)}</p>
              )}
            </CardContent>
          </Card>

          {outstanding.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <TrendingDown className="h-10 w-10 text-green-500 mx-auto mb-3" />
                <h3 className="font-semibold">All Clear!</h3>
                <p className="text-muted-foreground text-sm mt-1">No outstanding dues found. Tally sync may still be pending.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {outstanding.map((row, i) => (
                <Card key={i} className="hover:shadow-sm transition-shadow">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{row.voucher_no || row.bill_ref || `Bill ${i+1}`}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {row.voucher_date ? new Date(row.voucher_date).toLocaleDateString('en-IN') : '—'}
                          {row.due_date ? ` · Due: ${new Date(row.due_date).toLocaleDateString('en-IN')}` : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-amber-700">{formatAmt(row.balance_due)}</p>
                        {row.overdue_days > 0 && (
                          <p className="text-xs text-red-500">{row.overdue_days}d overdue</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <p className="text-xs text-muted-foreground mt-6 text-center">
            <AlertCircle className="h-3 w-3 inline mr-1" />
            Data synced from Tally. For payment queries, contact us on WhatsApp.
          </p>
        </div>
      </div>
    </>
  );
}
