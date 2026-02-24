import { supabase } from '@/lib/customSupabaseClient';

export const BillExtractionService = {
  extractDetails: async (file) => {
    // This simulates an AI service call (e.g., GPT-4 Vision, Azure Form Recognizer)
    return new Promise((resolve) => {
      setTimeout(() => {
        // Mock smart extraction based on filename or random
        const isJobWork = file.name.toLowerCase().includes('print') || file.name.toLowerCase().includes('dye');
        
        const mockData = {
          supplier_name: isJobWork ? "Star Printers" : "Surat Textiles Ltd",
          job_worker_name: isJobWork ? "Star Printers" : "",
          bill_date: new Date().toISOString().split('T')[0],
          bill_amount: Math.floor(Math.random() * 50000) + 5000,
          hsn_code: isJobWork ? "9988" : "5208",
          quantity: Math.floor(Math.random() * 1000) + 100,
          rate: Math.floor(Math.random() * 150) + 50,
          description: isJobWork ? "Digital Printing Charges on Rayon" : "60x60 Cambric Cotton Grey",
          confidence_score: 0.92,
          items: [
            {
                description: isJobWork ? "Digital Printing" : "Grey Fabric",
                quantity: 500,
                rate: 45,
                amount: 22500,
                hsn: isJobWork ? "9988" : "5208"
            }
          ]
        };
        resolve(mockData);
      }, 2500); // 2.5s delay to simulate AI processing
    });
  }
};