import { API_URL, TENANT_ID } from '@/lib/config';

export const invoicingService = {
  // Resolutions
  async getResolutions() {
    const res = await fetch(`${API_URL}/invoicing/resolutions?tenantId=${TENANT_ID}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
    });
    if (!res.ok) throw new Error('Error fetching DIAN resolutions');
    return res.json();
  },

  async createResolution(data: Record<string, unknown>) {
    const res = await fetch(`${API_URL}/invoicing/resolutions?tenantId=${TENANT_ID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error creating DIAN resolution');
    }
    return res.json();
  },

  // Billing Items (Catálogo)
  async getBillingItems() {
    const res = await fetch(`${API_URL}/invoicing/items?tenantId=${TENANT_ID}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
    });
    if (!res.ok) throw new Error('Error fetching Billing Items');
    return res.json();
  },

  async createBillingItem(data: Record<string, unknown>) {
    const res = await fetch(`${API_URL}/invoicing/items?tenantId=${TENANT_ID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error creating Billing Item');
    }
    return res.json();
  },

  async disableBillingItem(id: string) {
    const res = await fetch(`${API_URL}/invoicing/items/${id}/disable?tenantId=${TENANT_ID}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
    });
    if (!res.ok) throw new Error('Error disabling Billing Item');
    return res.json();
  },

  // Emitter
  async emitInvoice(data: Record<string, unknown>) {
    const res = await fetch(`${API_URL}/invoicing/invoices?tenantId=${TENANT_ID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error emitiendo factura (resolución puede no existir)');
    }
    return res.json();
  }
};
