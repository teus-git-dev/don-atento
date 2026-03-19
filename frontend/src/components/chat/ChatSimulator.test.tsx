import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChatSimulator from './ChatSimulator';
import '@testing-library/jest-dom';

// Mock the processMessage to avoid real network delays
jest.mock('@/services/whatsappOrchestrator', () => ({
  processMessage: jest.fn().mockResolvedValue({
    id: 'ai-resp',
    role: 'assistant',
    content: 'Mocked AI Response',
    timestamp: '10:00 AM'
  }),
  getSimulatedState: jest.fn().mockReturnValue({ id: null, state: 'TRIAGE' }),
  resetSimulation: jest.fn(),
  // Re-export constants
  Intent: {
    GREETING: 'GREETING',
    UNKNOWN: 'UNKNOWN'
  },
  Sentiment: {
    HAPPY: 'HAPPY',
    ANGRY: 'ANGRY',
    NEUTRAL: 'NEUTRAL'
  },
  detectIntent: jest.fn().mockReturnValue('GREETING')
}));

describe('ChatSimulator', () => {
  test('renders initial system message', () => {
    render(<ChatSimulator />);
    expect(screen.getByText(/Atento-Sim: Simulación de Negociación Cognitiva activa/i)).toBeInTheDocument();
  });

  test('allows user to type and send a message', async () => {
    render(<ChatSimulator />);
    
    const input = screen.getByPlaceholderText(/Escribe un mensaje aquí/i);
    const sendButton = screen.getByTitle(/Enviar/i) || screen.getAllByRole('button')[3]; // Select last button

    fireEvent.change(input, { target: { value: 'Hola' } });
    fireEvent.click(sendButton);

    // Initial user message should be in the document
    expect(screen.getByText('Hola')).toBeInTheDocument();
    
    await waitFor(() => {
        expect(screen.getByText('Mocked AI Response')).toBeInTheDocument();
    }, { timeout: 4000 });
  });

  test('updates metrics when messages are sent', async () => {
    render(<ChatSimulator />);
    
    const input = screen.getByPlaceholderText(/Escribe un mensaje aquí/i);
    const sendButton = screen.getAllByRole('button')[3];

    fireEvent.change(input, { target: { value: 'Tengo un problema' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
        // Look for the user input in the orchestration log (partial match because of substring in UI)
        expect(screen.getByText(/INPUT_STREAM: "Tengo un problema"/i)).toBeInTheDocument();
    });
  });
});
