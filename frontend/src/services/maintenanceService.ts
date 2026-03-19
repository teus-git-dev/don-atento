export type TicketStatus = 'pending' | 'in_progress' | 'resolved' | 'critical';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface MaintenanceTicket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  propertyId: string;
  reportedAt: Date;
  spatialPosition?: { x: number; y: number; z: number };
  aiConfidence: number;
  aiSuggestedCategory: string;
}

export interface PropertyHealthScore {
  propertyId: string;
  score: number; // 0-100
  trend: 'improving' | 'stable' | 'declining';
  nextInspectionRecommended: Date;
  predictedFailures: Array<{ system: string; probability: number }>;
}

const tickets: MaintenanceTicket[] = [];

export const maintenanceService = {
  createTicket: (ticket: Omit<MaintenanceTicket, 'id' | 'reportedAt'>): MaintenanceTicket => {
    const newTicket: MaintenanceTicket = {
      ...ticket,
      id: `TK-${Math.floor(Math.random() * 9000) + 1000}`,
      reportedAt: new Date(),
    };
    tickets.push(newTicket);
    console.log('Ticket Created:', newTicket);
    return newTicket;
  },

  getTicketsByProperty: (propertyId: string) => {
    return tickets.filter(t => t.propertyId === propertyId);
  },

  calculateHealthScore: (propertyId: string): PropertyHealthScore => {
    // Simulated predictive logic
    const propertyTickets = tickets.filter(t => t.propertyId === propertyId);
    const criticalCount = propertyTickets.filter(t => t.status === 'critical' || t.priority === 'urgent').length;
    
    let score = 95 - (criticalCount * 10) - (propertyTickets.length * 2);
    score = Math.max(0, Math.min(100, score));

    return {
      propertyId,
      score,
      trend: score < 70 ? 'declining' : score > 90 ? 'stable' : 'improving',
      nextInspectionRecommended: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // 30 days from now
      predictedFailures: [
        { system: 'Plomería', probability: Math.random() * 0.4 },
        { system: 'Eléctrico', probability: Math.random() * 0.2 },
      ]
    };
  }
};
