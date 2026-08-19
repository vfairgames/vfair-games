# Toast notifications

Shared toast system in `@vfair/web-shell`. Built on [`@radix-ui/react-toast`](https://www.radix-ui.com/primitives/docs/components/toast), styled with Radix Themes tokens.

Toasts render in a fixed **top-right** viewport (portaled to `document.body`, outside scaled game layout).

## Setup

`ToastProvider` is mounted inside `ThemeProvider`. Any app that wraps with `ThemeProvider` gets toasts automatically — no extra wiring.

```tsx
import { ThemeProvider, SessionGate } from '@vfair/web-shell';

root.render(
  <ThemeProvider>
    <SessionGate>
      <GameApp />
    </SessionGate>
  </ThemeProvider>,
);
```

## Basic usage

Import `toastService` from `@vfair/web-shell`. Callable from React components and non-React code (services, socket handlers).

```typescript
import { toastService, type ToastInput, type ToastOptions } from '@vfair/web-shell';

toastService.show({ title: 'Bet placed' });

toastService.success('Bet placed');
toastService.error('Connection lost');
toastService.warning('Balance low');
toastService.info('Demo mode');
```

`show()` and variant helpers return a toast `id`. Use it to dismiss programmatically:

```typescript
const id = toastService.info('Connecting…', { persist: true });

// later
toastService.dismiss(id);
```

## Options

Pass options as the second argument to variant helpers, or inside `show()`:

| Option        | Type      | Default | Description                                                                     |
| ------------- | --------- | ------- | ------------------------------------------------------------------------------- |
| `description` | `string`  | —       | Optional body text below the title                                              |
| `duration`    | `number`  | `3000`  | Auto-dismiss delay in ms. Ignored when `persist: true`                          |
| `closable`    | `boolean` | `true`  | Show close button; allow swipe right and Escape dismiss                         |
| `persist`     | `boolean` | `false` | Stay visible until `toastService.dismiss(id)`. No auto-dismiss, no user dismiss |

```typescript
toastService.error('Invalid bet', {
  description: 'Minimum bet is 0.01',
  duration: 8000,
});

toastService.show({
  title: 'Processing',
  variant: 'info',
  closable: false,
});

const loadingId = toastService.info('Syncing…', { persist: true });
toastService.dismiss(loadingId);
```

### `closable: false`

Hides the close button and blocks swipe right and Escape. Toast still auto-dismisses after `duration` unless `persist` is set.

### `persist: true`

Toast remains until `toastService.dismiss(id)`. User cannot close it (no close button, no swipe, no Escape). `duration` is ignored.

## Variants

| Variant   | Background tint |
| --------- | --------------- |
| `default` | Neutral panel   |
| `success` | Green           |
| `error`   | Red             |
| `warning` | Amber           |
| `info`    | Blue            |

## API reference

### `toastService.show(input)`

```typescript
toastService.show({
  title: string;
  description?: string;
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  closable?: boolean;
  persist?: boolean;
}): string
```

### `toastService.success(title, options?)`

### `toastService.error(title, options?)`

### `toastService.warning(title, options?)`

### `toastService.info(title, options?)`

`options` is `{ description?, duration?, closable?, persist? }`.

### `toastService.dismiss(id)`

Plays the close animation, then removes the toast. Use for persistent toasts or early dismissal.

### `toastService.clearAll()`

Plays the exit animation for every visible toast, then removes them (same as calling `dismiss()` on each).

## Behavior

- **Position:** top right of the viewport
- **Enter:** slides in from the right
- **Close:** slides out to the right and fades out (close button, auto-dismiss, swipe, or `dismiss()`)
- **Swipe:** swipe right to dismiss (when `closable` and not `persist`)
- **Stacking:** multiple toasts stack vertically in the viewport

## Example: loading toast

```typescript
const showLoading = () => {
  return toastService.info('Placing bet…', { persist: true, closable: false });
};

const hideLoading = (id: string) => {
  toastService.dismiss(id);
};
```

## Example: game service

```typescript
import { toastService } from '@vfair/web-shell';

const placeBet = async () => {
  try {
    await gameService.placeBet(amount);
    toastService.success('Bet placed');
  } catch (error) {
    toastService.error('Bet failed', {
      description: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
```
