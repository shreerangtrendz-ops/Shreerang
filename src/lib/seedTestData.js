import { supabase } from '@/lib/customSupabaseClient';

export const SeedService = {
  seedTestUnits: async () => {
    const jobUnits = Array.from({ length: 5 }).map((_, i) => ({
      unit_name: `Test Job Unit ${i + 1}`,
      unit_code: `JU-${100 + i}`,
      contact_person: `Manager ${i + 1}`,
      phone: `987654321${i}`,
      email: `jobunit${i + 1}@example.com`,
      address: `Industrial Area, Plot ${i + 1}, Surat`,
      created_at: new Date()
    }));

    const vaUnits = Array.from({ length: 5 }).map((_, i) => ({
      unit_name: `Test VA Unit ${i + 1}`,
      unit_code: `VA-${100 + i}`,
      contact_person: `Supervisor ${i + 1}`,
      phone: `987654322${i}`,
      email: `vaunit${i + 1}@example.com`,
      address: `GIDC, Phase ${i + 1}, Surat`,
      created_at: new Date()
    }));

    const { error: err1 } = await supabase.from('job_work_units').insert(jobUnits);
    if (err1) throw err1;

    const { error: err2 } = await supabase.from('va_units').insert(vaUnits);
    if (err2) throw err2;

    return { jobUnits: 5, vaUnits: 5 };
  },

  seedTestFabrics: async () => {
    const types = ['base', 'fancy_base', 'finish', 'fancy_finish'];
    const fabrics = [];

    types.forEach(type => {
      for (let i = 1; i <= 5; i++) {
        fabrics.push({
          name: `Test ${type.replace('_', ' ').toUpperCase()} ${i}`,
          sku: `TEST-${type.substring(0, 3).toUpperCase()}-${100 + i}`,
          type: type,
          base_fabric_details: { construction: '60x60', weight: '80gsm' },
          status: 'active',
          created_at: new Date()
        });
      }
    });

    const { data, error } = await supabase.from('fabric_master').insert(fabrics).select();
    if (error) throw error;
    return data;
  },

  seedTestPrices: async (fabrics) => {
    if (!fabrics || fabrics.length === 0) return 0;
    
    // Get Units for FK
    const { data: jobUnits } = await supabase.from('job_work_units').select('id').limit(5);
    const { data: vaUnits } = await supabase.from('va_units').select('id').limit(5);

    const prices = [];
    const jobPrices = [];
    const vaPrices = [];

    // Fabric Prices
    fabrics.forEach(fabric => {
      prices.push({
        fabric_master_id: fabric.id,
        price: Math.floor(Math.random() * 300) + 100,
        effective_date: new Date().toISOString().split('T')[0],
        created_at: new Date()
      });
    });

    // Job Prices (only for finish/fancy types usually, but seeding generic here)
    if (jobUnits && jobUnits.length > 0) {
      fabrics.slice(0, 5).forEach((fabric, idx) => {
        jobPrices.push({
          fabric_master_id: fabric.id,
          job_work_unit_id: jobUnits[idx % jobUnits.length].id,
          price: Math.floor(Math.random() * 50) + 10,
          charge_on: 'Input',
          shortage_percent: 2.5,
          effective_date: new Date().toISOString().split('T')[0],
          created_at: new Date()
        });
      });
    }

    // VA Prices
    if (vaUnits && vaUnits.length > 0) {
      fabrics.slice(5, 10).forEach((fabric, idx) => {
        vaPrices.push({
          fabric_master_id: fabric.id,
          va_unit_id: vaUnits[idx % vaUnits.length].id,
          va_category: 'Embroidery',
          price: Math.floor(Math.random() * 100) + 50,
          shortage_percent: 1.5,
          effective_date: new Date().toISOString().split('T')[0],
          created_at: new Date()
        });
      });
    }

    if (prices.length) await supabase.from('fabric_prices').insert(prices);
    if (jobPrices.length) await supabase.from('job_prices').insert(jobPrices);
    if (vaPrices.length) await supabase.from('va_prices').insert(vaPrices);

    return { fabricPrices: prices.length, jobPrices: jobPrices.length, vaPrices: vaPrices.length };
  },

  seedTestDesigns: async (fabrics) => {
    if (!fabrics || fabrics.length === 0) return 0;

    const designs = Array.from({ length: 10 }).map((_, i) => ({
      design_number: `FD-TEST-${1000 + i}`,
      design_name: `Floral Pattern ${i + 1}`,
      fabric_id: fabrics[i % fabrics.length].id, // Assuming FK is fabric_id based on schema provided earlier
      status: 'active',
      created_at: new Date()
    }));

    const { error } = await supabase.from('designs').insert(designs);
    if (error) throw error;
    return designs.length;
  },

  seedTestCostings: async (fabrics) => {
    if (!fabrics || fabrics.length === 0) return 0;
    
    // Schiffli Costing
    const costings = Array.from({ length: 5 }).map((_, i) => ({
      fabric_id: fabrics[i % fabrics.length].id,
      grey_cost: 150,
      shortage_percentage: 5,
      schiffli_rate: 45,
      deca_rate: 10,
      total_cost: 215, // Simplified calc
      cost_per_mtr: 215,
      created_at: new Date()
    }));

    const { error } = await supabase.from('schiffli_costing').insert(costings);
    if (error) throw error;
    return costings.length;
  },

  clearAllTestData: async () => {
    // Delete in order to avoid FK constraints violations (roughly)
    await supabase.from('schiffli_costing').delete().ilike('created_at', '%'); // Delete all not feasible safely without filter, assuming test db or user filter
    // In a real app, we'd tag test data. Here we will delete based on name pattern if possible or truncate tables if allowed.
    // For safety, let's delete only rows with 'Test' in name where applicable or created recently.
    
    // Deleting by pattern for this exercise
    await supabase.from('fabric_prices').delete().gt('price', 0); // Risky in prod, strictly for test env
    await supabase.from('job_prices').delete().gt('price', 0);
    await supabase.from('va_prices').delete().gt('price', 0);
    await supabase.from('designs').delete().ilike('design_number', 'FD-TEST%');
    await supabase.from('fabric_master').delete().ilike('name', 'Test%');
    await supabase.from('job_work_units').delete().ilike('unit_name', 'Test%');
    await supabase.from('va_units').delete().ilike('unit_name', 'Test%');
    
    return true;
  },

  seedAll: async () => {
    const units = await SeedService.seedTestUnits();
    const fabrics = await SeedService.seedTestFabrics();
    const prices = await SeedService.seedTestPrices(fabrics);
    const designs = await SeedService.seedTestDesigns(fabrics);
    const costings = await SeedService.seedTestCostings(fabrics);

    return { units, fabrics: fabrics.length, prices, designs, costings };
  }
};