import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
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
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('renders initial system message', () => {
    render(<ChatSimulator />);
    expect(screen.getByText(/Atento-Sim: Simulación de Negociación Cognitiva activa/i)).toBeInTheDocument();
  });

  test('allows user to type and send a message', async () => {
    render(<ChatSimulator />);
    
    const input = screen.getByPlaceholderText(/Escribe un mensaje aquí/i);
    const sendButton = screen.queryByTitle(/Enviar/i) || screen.getAllByRole('button')[3]; // Select last button

    fireEvent.change(input, { target: { value: 'Hola' } });
    fireEvent.click(sendButton);

    expect(screen.getByText('Hola')).toBeInTheDocument();
    
    // Advance timers by the maximum possible timeout (1500 + 1000)
    await act(async () => {
        jest.advanceTimersByTime(3000);
        // Let promises resolve
        await Promise.resolve();
    });

    await waitFor(() => {
        expect(screen.getByText('Mocked AI Response')).toBeInTheDocument();
    });
  });

  test('updates metrics when messages are sent', async () => {
    render(<ChatSimulator />);
    
    const input = screen.getByPlaceholderText(/Escribe un mensaje aquí/i);
    const sendButton = screen.getAllByRole('button')[3];

    fireEvent.change(input, { target: { value: 'Tengo un problema' } });
    fireEvent.click(sendButton);
    // Advance timers by the maximum possible timeout
    await act(async () => {
        jest.advanceTimersByTime(3000);
        await Promise.resolve();
    });

    await waitFor(() => {
        // Look for the user input in the orchestration log (partial match because of substring in UI)
        expect(screen.getByText(/INPUT_STREAM: "Tengo un problema"/i)).toBeInTheDocument();
    });
  });
});
