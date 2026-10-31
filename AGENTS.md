<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- The coding agent calls Gemini directly with a server-only project secret read inside its authenticated server-function handler; never store provider keys in browser storage or fall back to the paid gateway.
- The app builder previews browser-ready HTML/CSS/JavaScript only; do not claim it executes npm builds or TanStack Start servers.
