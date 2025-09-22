import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

beforeEach(() => {
  // ensure localStorage doesn't leak state between tests
  localStorage.clear();
});

test('can add team, update score and eliminate', () => {
  render(<App />);

  const input = screen.getByLabelText('team-name');
  const addBtn = screen.getByText('Add Team');

  // add a team
  fireEvent.change(input, { target: { value: 'Alpha' } });
  fireEvent.click(addBtn);

  // team appears in active teams
  expect(screen.getByText('Alpha')).toBeInTheDocument();
  expect(screen.getByText('0')).toBeInTheDocument();

  // click +5
  const plus5 = screen.getByText('+5');
  fireEvent.click(plus5);
  expect(screen.getByText('5')).toBeInTheDocument();

  // eliminate team
  const elim = screen.getByText('Eliminate');
  fireEvent.click(elim);

  // active teams should show empty message
  expect(screen.getByText(/No active teams/i)).toBeInTheDocument();

  // eliminated should contain the team name and its score
  expect(screen.getByText('Alpha')).toBeInTheDocument();
  expect(screen.getByText('5')).toBeInTheDocument();
});

test('undo elimination restores team', () => {
  render(<App />);

  const input = screen.getByLabelText('team-name');
  const addBtn = screen.getByText('Add Team');

  fireEvent.change(input, { target: { value: 'Bravo' } });
  fireEvent.click(addBtn);

  // eliminate Bravo
  const elim = screen.getByText('Eliminate');
  fireEvent.click(elim);

  // undo should appear
  const undo = screen.getByText(/Undo eliminate/i);
  expect(undo).toBeInTheDocument();

  fireEvent.click(undo);

  // Bravo should be back in active teams
  expect(screen.getByText('Bravo')).toBeInTheDocument();
  // eliminated list should not contain Bravo
  const eliminatedPanel = screen.queryByText('No eliminated teams.');
  // since we restored, eliminated may be empty
  expect(eliminatedPanel).toBeInTheDocument();
});

test('restore eliminated team via Restore button', () => {
  render(<App />);

  const input = screen.getByLabelText('team-name');
  const addBtn = screen.getByText('Add Team');

  fireEvent.change(input, { target: { value: 'Charlie' } });
  fireEvent.click(addBtn);

  const elim = screen.getByText('Eliminate');
  fireEvent.click(elim);

  // Restore button should be present
  const restore = screen.getByText('Restore');
  expect(restore).toBeInTheDocument();

  fireEvent.click(restore);

  // Charlie should be back
  expect(screen.getByText('Charlie')).toBeInTheDocument();
});

test('reset all clears data when confirmed', () => {
  render(<App />);

  const input = screen.getByLabelText('team-name');
  const addBtn = screen.getByText('Add Team');

  fireEvent.change(input, { target: { value: 'Delta' } });
  fireEvent.click(addBtn);

  // ensure it's present
  expect(screen.getByText('Delta')).toBeInTheDocument();

  // mock confirm to accept
  const orig = window.confirm;
  window.confirm = () => true;

  const resetBtn = screen.getByText('Reset all');
  fireEvent.click(resetBtn);

  // After reset, no active teams
  expect(screen.getByText(/No active teams/i)).toBeInTheDocument();

  // restore window.confirm
  window.confirm = orig;
});
