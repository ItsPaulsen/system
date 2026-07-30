# system

Design-system reference for system.kristianpaulsen.com.

## Cascade layers (for anyone building on this)

The CSS ships inside [cascade layers](https://developer.mozilla.org/en-US/docs/Web/CSS/@layer), declared in this order (lowest to highest priority):

```css
@layer base, tokens, components;
```

- **base** — site chrome and the reset (`assets/base.css`)
- **tokens** — the `:root` custom properties (`demo/tokens.css`)
- **components** — the component library (`demo/components.css`)

### How to override

Your own CSS does not live in any of these layers, and **unlayered CSS beats every layer**. So to override anything here, write a plain rule. No higher specificity, no `!important`:

```css
/* Wins over the library, even against more specific selectors like `.card .button` */
.button {
  border-radius: 0;
}

/* Retint the whole system by overriding a token */
:root {
  --anchor-primary: 0 90 200;
}
```

The one exception: an `!important` declaration inside the library still wins over a non-important override. The library uses `!important` only in the `base` layer, for reduced-motion and theme-swap guards, so this rarely matters in practice.

If you use your own `@layer`s, put them after these in your layer statement (or leave them unlayered) to stay on top.
