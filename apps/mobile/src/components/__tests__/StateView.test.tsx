import { fireEvent, render, screen } from '@testing-library/react-native';

import { EmptyState, ErrorState } from '../StateView';

// TODO(team): add smoke tests that each screen renders (design doc §12) — needs mocks for
// react-native-maps and expo-location.
describe('StateView', () => {
  it('renders an empty state', async () => {
    await render(<EmptyState title="All clear on campus" body="No active reports." />);
    expect(await screen.findByText('All clear on campus')).toBeTruthy();
  });

  it('never shows a raw error and offers a retry', async () => {
    const onRetry = jest.fn();
    await render(<ErrorState onRetry={onRetry} />);
    expect(await screen.findByText('Couldn’t load this right now')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalled();
  });
});
