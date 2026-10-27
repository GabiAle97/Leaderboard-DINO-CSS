# Project notes

- This is a dependency-free Spanish-language prototype for the Dino Crisis Cutscene Skip Mod leaderboard.
- Supported categories: ANY%, BEST ENDING, and SEGMENTED%.
- Google sign-in and Apps Script run endpoints are scaffolded in `config.js` and `apps-script/Code.gs`; keep them disabled until OAuth ID and updated deployment are configured.
- Moderator permissions must be checked server-side using the protected `Usuarios` sheet; never trust a role supplied by the browser.
- Demo leaderboard rows are fictional and must not be presented as verified records.
- Open `index.html` directly in a modern browser to run the prototype.
