const API_URL = import.meta.env.VITE_KVM1_API_URL;
const API_KEY = import.meta.env.VITE_KVM1_API_KEY;

export const KVM1Service = {
  getServerStatus: async () => {
    if (!API_URL) return { status: 'unknown' };
    
    // Mock for demo
    return {
      status: 'online',
      uptime: '14d 2h 12m',
      lastCheck: new Date().toISOString(),
      cpu: 45,
      ram: 62,
      disk: 28
    };
  }
};