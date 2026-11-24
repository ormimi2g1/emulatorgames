import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AppRoutes, Providers } from './App';
import { createParentPin } from './auth/pin';
import { demoProfiles, saveProfile, setActiveProfileId } from './data/profiles';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Providers>
        <AppRoutes />
      </Providers>
    </MemoryRouter>,
  );
}

async function typePin(user: ReturnType<typeof userEvent.setup>, pin: string, submit: string | RegExp = /ok/i) {
  for (const d of pin) await user.click(screen.getByRole('button', { name: d }));
  await user.click(screen.getByRole('button', { name: submit }));
}

async function seed() {
  await createParentPin('2580');
  const [afa, terdoo] = demoProfiles();
  await saveProfile(afa);
  await saveProfile(terdoo);
  await setActiveProfileId(afa.id);
  return { afa, terdoo };
}

describe('first run', () => {
  it('sends a new install to parent setup and completes it', async () => {
    const user = userEvent.setup();
    renderAt('/');
    await user.click(await screen.findByRole('button', { name: /let's set up/i }));
    await typePin(user, '2580', /next/i);
    await typePin(user, '2580', /save/i);
    expect(await screen.findByTestId('recovery-code')).toHaveTextContent(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    const next = screen.getByRole('button', { name: /next/i });
    expect(next).toBeDisabled();
    await user.click(screen.getByRole('checkbox', { name: /wrote it down/i }));
    await user.click(next);
    await user.click(screen.getByRole('button', { name: /afa & terdoo/i }));
    expect(await screen.findByRole('heading', { level: 1, name: /who's playing/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /terdoo/i }));
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Terdoo');
  });

  it('rejects a weak PIN and a mismatched confirmation', async () => {
    const user = userEvent.setup();
    renderAt('/welcome');
    await user.click(await screen.findByRole('button', { name: /let's set up/i }));
    await typePin(user, '1234', /next/i);
    expect(await screen.findByRole('alert')).toHaveTextContent(/sequence/i);
    await typePin(user, '2580', /next/i);
    await typePin(user, '2581', /save/i);
    expect(await screen.findByRole('alert')).toHaveTextContent(/didn't match/i);
  });
});

describe('arcade', () => {
  it('shows the home screen: the platformer is playable, coming-soon games cannot be launched', async () => {
    await seed();
    renderAt('/');
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Afa');
    const afa = screen.getAllByTestId('game-card-afa-terdoo')[0];
    expect(afa).not.toHaveTextContent(/coming soon/i);
    expect(within(afa).getByRole('button', { name: /^▶ play$/i })).toBeInTheDocument();
    const kart = screen.getAllByTestId('game-card-rainbow-kart')[0];
    expect(kart).toHaveTextContent(/coming soon/i);
    expect(within(kart).queryByRole('button', { name: /^▶ play$/i })).toBeNull();
  });

  it('lets a player favorite a game', async () => {
    const user = userEvent.setup();
    await seed();
    renderAt('/puzzles');
    await user.click(await screen.findByRole('button', { name: /add memory magic to favorites/i }));
    expect(await screen.findByRole('button', { name: /remove memory magic from favorites/i })).toHaveAttribute('aria-pressed', 'true');
  });

  it('redirects to the player picker when no player is selected', async () => {
    await seed();
    await setActiveProfileId(null);
    renderAt('/adventure');
    expect(await screen.findByRole('heading', { name: /who's playing/i })).toBeInTheDocument();
  });
});

describe('parent zone', () => {
  it('is locked behind the PIN and rejects a wrong PIN', async () => {
    const user = userEvent.setup();
    await seed();
    renderAt('/parent/profiles');
    expect(await screen.findByText(/grown-ups only/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add player/i })).toBeNull();
    await typePin(user, '9999');
    expect(await screen.findByRole('alert')).toHaveTextContent(/not right/i);
    expect(screen.queryByRole('button', { name: /add player/i })).toBeNull();
  });

  it('unlocks with the right PIN, adds a player and deletes one', async () => {
    const user = userEvent.setup();
    await seed();
    renderAt('/parent/profiles');
    await screen.findByText(/grown-ups only/i);
    await typePin(user, '2580');
    await user.click(await screen.findByRole('button', { name: /add player/i }));
    await user.type(screen.getByLabelText(/nickname/i), 'Sunny');
    await user.click(screen.getByRole('button', { name: /^save$/i }));
    expect(await screen.findByText('Sunny')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /delete terdoo/i }));
    await user.click(await screen.findByRole('button', { name: /^delete$/i }));
    await waitFor(() => expect(screen.queryByText('Terdoo')).toBeNull());
  });

  it('hides a game for everyone when the parent turns it off', async () => {
    const user = userEvent.setup();
    await seed();
    renderAt('/parent/games');
    await screen.findByText(/grown-ups only/i);
    await typePin(user, '2580');
    await user.click(await screen.findByRole('checkbox', { name: /memory magic/i }));
    await user.click(screen.getAllByRole('link', { name: /puzzles/i })[0]);
    expect(await screen.findByText(/no games here yet/i)).toBeInTheDocument();
  });
});
