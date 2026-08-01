AGAMEMNON FORMULA + STEP SCHEDULE PATCH

Copy the contents of this folder over the root of your existing Agamemnon repository.
It fixes:
- Raw Markdown markers in Odysseus responses
- Raw LaTeX formulas such as $$\\nabla^2u...$$
- STEP schedule from 12:30–4:30 to 1:00–5:00

No new npm dependency is required. The formula renderer uses native browser MathML.

After copying, run:
  npm ci
  npm run lint
  npm run build
  git add -A
  git commit -m "Fix AI formula rendering and update STEP hours"
  git push origin main
