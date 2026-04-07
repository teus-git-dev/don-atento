import { API_URL, TENANT_ID } from '@/lib/config';

export const accountingService = {
  async getPuc() {
    const res = await fetch(`${API_URL}/accounting/puc?tenantId=${TENANT_ID}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
    });
    if (!res.ok) throw new Error('Error fetching PUC');
    return res.json();
  },

  async getJournalEntries() {
    const res = await fetch(`${API_URL}/accounting/journal-entries?tenantId=${TENANT_ID}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
    });
    if (!res.ok) throw new Error('Error fetching Journal Entries');
    return res.json();
  },

  async createJournalEntry(data: any) {
    const res = await fetch(`${API_URL}/accounting/journal-entries?tenantId=${TENANT_ID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error creating Journal Entry');
    }
    return res.json();
  },

  async postJournalEntry(id: string) {
    const res = await fetch(`${API_URL}/accounting/journal-entries/${id}/post?tenantId=${TENANT_ID}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
    });
    if (!res.ok) throw new Error('Error posting Journal Entry');
    return res.json();
  }
};
