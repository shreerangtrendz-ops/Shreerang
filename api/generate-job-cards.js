// api/generate-job-cards.js
// Auto-generate job cards from an order's finish fabric process steps
// POST { order_id }

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://zdekydcscwhuusliwqaz.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { order_id } = req.body || {};
  if (!order_id) return res.status(400).json({ error: 'order_id required' });

  try {
    // 1. Get the order with finish fabric details
    const { data: order, error: orderErr } = await supabase
      .from('sales_orders')
      .select('*, finish_fabrics(id, finish_fabric_name, process_steps, process_costs)')
      .eq('id', order_id)
      .single();

    if (orderErr || !order) return res.status(404).json({ error: 'Order not found' });

    const fabric = order.finish_fabrics;
    if (!fabric) return res.status(400).json({ error: 'Order has no finish fabric linked' });

    // 2. Parse process steps
    let processSteps = [];
    try { processSteps = JSON.parse(fabric.process_steps || '[]'); } catch {}
    let processCosts = {};
    try { processCosts = JSON.parse(fabric.process_costs || '{}'); } catch {}

    if (processSteps.length === 0) {
      return res.status(400).json({ error: 'Finish fabric has no process steps defined' });
    }

    // 3. Check if job cards already exist for this order
    const { data: existing } = await supabase
      .from('job_cards')
      .select('id')
      .eq('order_id', order_id);

    if (existing && existing.length > 0) {
      return res.status(200).json({ success: true, message: 'Job cards already exist', count: existing.length, cards: existing });
    }

    // 4. Generate one job card per process step
    const cardsToInsert = processSteps.map((step, idx) => {
      const costData = processCosts[step._uid || step.id + idx] || {};
      return {
        order_id: order.id,
        finish_fabric_id: fabric.id,
        fabric_name: fabric.finish_fabric_name,
        design_no: order.design_no,
        process_step: step.label || step.id,
        step_sequence: idx + 1,
        job_worker_name: costData.job_worker || null,
        rate: costData.rate ? parseFloat(costData.rate) : 0,
        shortage_pct: costData.shortage_pct ? parseFloat(costData.shortage_pct) : 0,
        qty_sent: order.metres || 0,
        status: 'pending',
      };
    });

    const { data: cards, error: insertErr } = await supabase
      .from('job_cards')
      .insert(cardsToInsert)
      .select();

    if (insertErr) throw insertErr;

    // 5. Also create a production batch
    await supabase.from('production_batches').insert({
      order_id: order.id,
      finish_fabric_id: fabric.id,
      fabric_name: fabric.finish_fabric_name,
      total_metres: order.metres || 0,
      stage: 'grey_in',
    });

    return res.status(200).json({
      success: true,
      message: `Generated ${cards.length} job cards`,
      count: cards.length,
      cards,
    });

  } catch (err) {
    console.error('generate-job-cards error:', err);
    return res.status(500).json({ error: err.message });
  }
}
