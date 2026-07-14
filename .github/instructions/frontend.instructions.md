---
applyTo: "**/*.css,**/*.scss,**/*.html,**/style.*"
---

# Frontend / Styling Rules

- Use semantic HTML elements (`<main>`, `<section>`, `<article>`, `<nav>`)
- CSS custom properties for theming (not hardcoded hex values)
- Mobile-first responsive design: start small, add `min-width` media queries
- Accessibility: all images need `alt`, interactive elements need `aria-label` if no visible text
- Never use inline styles in production HTML — use classes
- CSP compliance: no inline scripts or styles; use nonces where required
- For VS Code webviews: use `vscode-` CSS variables for theme integration
