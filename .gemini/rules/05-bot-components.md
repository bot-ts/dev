# Domain 5: Bot Components & Handlers

The system core features a unified loading, validating, and hot-reloading architecture for bot elements.

## 1. Unified `createHandler` Factory
To eliminate boilerplate code, all directory file scanners use the centralized `createHandler` helper from `packages/core/src/util.ts`:

```typescript
export const buttonHandler = util.createHandler<Button>({
  directory: "buttons",
  expectedClass: Button,
  onLoad: (filepath, button) => {
    buttons.add(button)
  },
  onRemove: (filepath, button) => {
    buttons.delete(button.options.name)
  },
})
```

* **Important Rule**: Always declare classes (like `class Button` or `class Command`) **before** instantiating their handlers to avoid temporal dead zone (TDZ) reference errors at load time.
* **Generic constructors override**: When calling `createHandler` for generic classes or interfaces, specify the interface explicitly (e.g. `createHandler<ISlashCommand>`) to satisfy compiler type checks.

## 2. Element Collections & Validation
All element collections inherit from `ElementCollection<T>` in `util.ts` which extends discord.js's `Collection`. This centralizes the `add` and `validate` methods, and prevents duplicate registration crashes during ESM double loads:

```typescript
export const buttons = new (class ButtonCollection extends util.ElementCollection<IButton> {
  constructor() {
    super("Button")
  }

  override validate(button: IButton) {
    super.validate(button)
    // custom validations...
  }
})()
```

## 3. Hot Reload Lifecycle & Cleaning
When running in `BOT_MODE=development`, `hotReload` is enabled. To avoid memory leaks or duplicate triggers, each handler implements proper cleanup:
* **Cron Jobs**: Stop the old cron job instance via `cron.stop()` before deleting and re-registering.
* **Event Listeners**: Unbind previous listener wrappers from the `discord.js` client using `client.off(event, wrapper)` inside the handler's `onRemove` callback, keeping track of active wrappers via a mapping.
