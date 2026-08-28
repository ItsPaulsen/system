# system

Design-system reference for system.kristianpaulsen.com.

Internal reference for building projects with my team. It's not published for outside reuse, so there's intentionally no open-source license.

The live site is the reference: browse the foundations and components there. This repo is the source, and a finished project is delivered as plain CSS (below).

## Using a project

A finished project is just CSS, no build step, so it drops into any stack (plain HTML, React, anything) and a dev works their own way:

1. Take `globals.css` (the foundation plus every token). This is the baseline everything builds on.
2. Take the CSS for each component you need. Every component page has a **Copy CSS** button, or grab `components.css` wholesale.
3. Use the markup: plain HTML classes, or the React snippet shown alongside each component.
4. Load the fonts (Geist, via the `<link>` in any page's `<head>`) and any assets you reference (icons, illustrations).

That's the whole handoff. The CSS stands alone, it has no dependency on this repo. Retint or override anything with plain unlayered CSS (see below).

## Run locally

Static site, no build. Serve the folder and open it in a browser:

```bash
python3 -m http.server 8000
# or: npx serve
```

## Cascade layers (for the team building on this)

The CSS ships inside [cascade layers](https://developer.mozilla.org/en-US/docs/Web/CSS/@layer), declared in this order (lowest to highest priority):

```css
@layer base, tokens, components;
```

- **base** — the reset + foundation a project ships on (`demo/globals.css`), plus the docs-site chrome (`assets/base.css`)
- **tokens** — the `:root` custom properties (`demo/globals.css`)
- **components** — the component library (`demo/components.css`)

### How to override

Your own CSS does not live in any of these layers, and **unlayered CSS beats every layer**. So to override anything here, write a plain rule. No higher specificity, no `!important`:

```css
/* Wins over the library, even against more specific selectors like `.card .button` */
.button {
  border-radius: 0;
}

/* Retint the whole system by overriding an anchor variable (the raw value the tokens derive from) */
:root {
  --anchor-primary: 0 90 200;
}
```

To retint a single region instead of the whole system, wrap it in `data-color="primary|neutral|red"`. Every accent-aware component inside (Button, Badge, Chip, Alert) re-skins from that one context, and it flips with the theme for free. The **Theming** page on the live site walks through the full model: anchors feed derived roles, components read only the roles, so changing one anchor retints everything downstream.

The one exception: an `!important` declaration inside the library still wins over a non-important override. The library uses `!important` only in the `base` layer, for reduced-motion and theme-swap guards, so this rarely matters in practice.

If you use your own `@layer`s, put them after these in your layer statement (or leave them unlayered) to stay on top.
