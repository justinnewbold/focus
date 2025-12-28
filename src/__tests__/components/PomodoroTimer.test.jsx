import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import PomodoroTimer from '../../components/PomodoroTimer';

// Mock the hooks
vi.mock('../../hooks/useSound', () => ({
  useSound: () => ({
    playSound: vi.fn(),
    startAlarm: vi.fn(),
    stopAlarm: vi.fn()
  })
}));

vi.mock('../../hooks/usePageVisibility', () => ({
  usePageVisibility: () => {}
}));

vi.mock('../../utils/storage', () => ({
  timerStorage: {
    load: vi.fn(() => null),
    save: vi.fn(),
    clear: vi.fn()
  }
}));

vi.mock('../../utils/notifications', () => ({
  notify: vi.fn()
}));

describe('PomodoroTimer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders with default focus duration', () => {
    render(<PomodoroTimer />);

    expect(screen.getByText('25:00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });

  it('uses custom preferences for duration', () => {
    const preferences = {
      focus_duration: 50,
      short_break_duration: 10,
      long_break_duration: 30
    };

    render(<PomodoroTimer preferences={preferences} />);

    expect(screen.getByText('50:00')).toBeInTheDocument();
  });

  it('shows mode selection buttons', () => {
    render(<PomodoroTimer />);

    expect(screen.getByRole('tab', { name: /focus/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /short/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /long/i })).toBeInTheDocument();
  });

  it('switches modes when clicked', () => {
    render(<PomodoroTimer />);

    const shortBreakBtn = screen.getByRole('tab', { name: /short/i });
    fireEvent.click(shortBreakBtn);

    // Short break is 5 minutes by default
    expect(screen.getByText('05:00')).toBeInTheDocument();
  });

  it('does not switch modes when running', () => {
    render(<PomodoroTimer />);

    // Start timer
    const startBtn = screen.getByRole('button', { name: /start/i });
    fireEvent.click(startBtn);

    // Try to switch mode
    const shortBreakBtn = screen.getByRole('tab', { name: /short/i });
    fireEvent.click(shortBreakBtn);

    // Should still show focus time (25:00 or close to it)
    expect(screen.queryByText('05:00')).not.toBeInTheDocument();
  });

  it('starts and pauses timer', () => {
    render(<PomodoroTimer />);

    const startBtn = screen.getByRole('button', { name: /start/i });
    fireEvent.click(startBtn);

    // Button should now say Pause
    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();

    // Click again to pause
    fireEvent.click(screen.getByRole('button', { name: /pause/i }));
    expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();
  });

  it('resets timer', () => {
    render(<PomodoroTimer />);

    // Start timer
    fireEvent.click(screen.getByRole('button', { name: /start/i }));

    // Advance time
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Reset
    fireEvent.click(screen.getByRole('button', { name: /reset/i }));

    // Should be back to 25:00
    expect(screen.getByText('25:00')).toBeInTheDocument();
  });

  it('calls onComplete when timer finishes', async () => {
    const onComplete = vi.fn();
    render(<PomodoroTimer onComplete={onComplete} />);

    // Start timer
    fireEvent.click(screen.getByRole('button', { name: /start/i }));

    // Advance time past the full duration
    act(() => {
      vi.advanceTimersByTime(25 * 60 * 1000 + 1000);
    });

    expect(onComplete).toHaveBeenCalled();
  });

  it('shows keyboard shortcut hints', () => {
    render(<PomodoroTimer />);

    expect(screen.getByText(/space/i)).toBeInTheDocument();
    expect(screen.getByText(/to start/i)).toBeInTheDocument();
  });

  it('updates document title when running', () => {
    render(<PomodoroTimer />);

    fireEvent.click(screen.getByRole('button', { name: /start/i }));

    expect(document.title).toContain('FOCUS');
  });

  it('exposes toggle and reset via ref', () => {
    const ref = { current: null };
    render(<PomodoroTimer ref={ref} />);

    expect(ref.current).toBeDefined();
    expect(typeof ref.current.toggleTimer).toBe('function');
    expect(typeof ref.current.resetTimer).toBe('function');
  });

  it('displays current task when provided', () => {
    render(<PomodoroTimer currentTask="Deep Work Session" />);

    expect(screen.getByText('Deep Work Session')).toBeInTheDocument();
  });
});
