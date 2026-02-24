const API_URL = import.meta.env.VITE_N8N_API_URL;
const API_KEY = import.meta.env.VITE_N8N_API_KEY;

export const N8nService = {
  triggerWorkflow: async (workflowId, data) => {
    if (!API_URL) return;

    try {
      const response = await fetch(`${API_URL}/webhook/${workflowId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(API_KEY && { 'X-N8N-API-KEY': API_KEY })
        },
        body: JSON.stringify(data)
      });
      return await response.json();
    } catch (error) {
      console.error("n8n Trigger Error:", error);
    }
  }
};