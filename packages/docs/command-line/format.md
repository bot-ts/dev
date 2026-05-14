---
description: Biome - Fast formatter and linter for JavaScript and TypeScript.
---

# Format

bot.ts uses [Biome](https://biomejs.dev/) for code formatting and linting. Biome is an extremely fast tool that combines the functionality of Prettier (formatting) and ESLint (linting) in a single package.

## Usage

{% tabs %}
{% tab title="bun" %}

```bash
bun run format
```

{% endtab %}

{% tab title="npm" %}

```bash
npm run format
```

{% endtab %}

{% tab title="yarn" %}

```bash
yarn format
```

{% endtab %}

{% tab title="Biome CLI" %}

```bash
bunx biome check --write src scripts package.json
```

{% endtab %}
{% endtabs %}

## What it does

The `format` command runs Biome with the `--write` flag, which:

1. **Formats** your code according to the configured style
2. **Lints** your code for potential errors and bad practices
3. **Organizes imports** alphabetically and removes unused ones
4. **Fixes** auto-fixable issues automatically

## Configuration

Biome is configured via the `biome.json` file at the root of your project.

### Default configuration

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "formatter": {
    "enabled": true,
    "indentStyle": "tab"
  },
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "double",
      "semicolons": "asNeeded"
    }
  }
}
```

### Formatting options

| Option | Default | Description |
|--------|---------|-------------|
| `indentStyle` | `"tab"` | Use tabs for indentation |
| `quoteStyle` | `"double"` | Use double quotes for strings |
| `semicolons` | `"asNeeded"` | Only add semicolons where necessary |

### Linter rules

The framework uses Biome's recommended rules with some exceptions to accommodate common Discord bot patterns:

| Rule | Setting | Reason |
|------|---------|--------|
| `noExplicitAny` | `off` | Allows `any` type when needed |
| `noConfusingVoidType` | `off` | Allows `void` in union types |
| `noAssignInExpressions` | `off` | Allows assignments in expressions |
| `noNonNullAssertion` | `off` | Allows `!` non-null assertions |
| `noParameterAssign` | `off` | Allows reassigning function parameters |
| `noForEach` | `off` | Allows `.forEach()` method |
| `noDelete` | `off` | Allows `delete` operator |
| `useImportExtensions` | `off` | No file extensions required in imports |

## Customization

### Changing formatting style

To use spaces instead of tabs:

```json
{
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2
  }
}
```

### Adding semicolons everywhere

```json
{
  "javascript": {
    "formatter": {
      "semicolons": "always"
    }
  }
}
```

### Using single quotes

```json
{
  "javascript": {
    "formatter": {
      "quoteStyle": "single"
    }
  }
}
```

### Ignoring files

```json
{
  "files": {
    "ignore": ["dist/**", "node_modules/**", "*.min.js"]
  }
}
```

### Enabling stricter rules

```json
{
  "linter": {
    "rules": {
      "recommended": true,
      "suspicious": {
        "noExplicitAny": "error"
      },
      "style": {
        "noNonNullAssertion": "warn"
      }
    }
  }
}
```

## IDE Integration

### VS Code

Install the [Biome extension](https://marketplace.visualstudio.com/items?itemName=biomejs.biome) for VS Code to get:

- Format on save
- Real-time linting
- Quick fixes

Add to your `.vscode/settings.json`:

```json
{
  "editor.defaultFormatter": "biomejs.biome",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "quickfix.biome": "explicit",
    "source.organizeImports.biome": "explicit"
  }
}
```

### Other editors

Biome has plugins for many editors:
- [IntelliJ / WebStorm](https://plugins.jetbrains.com/plugin/22761-biome)
- [Neovim](https://biomejs.dev/guides/integrate-in-editor/#neovim)
- [Sublime Text](https://biomejs.dev/guides/integrate-in-editor/#sublime-text)

## Running checks without fixing

To check for issues without auto-fixing them:

```bash
bunx biome check src
```

To see what would change without writing:

```bash
bunx biome check --write --dry-run src
```

## CI Integration

Add Biome to your CI pipeline:

```yaml
# GitHub Actions example
- name: Check formatting and linting
  run: bunx biome check src
```

## More information

For complete documentation, visit the [Biome website](https://biomejs.dev/).
