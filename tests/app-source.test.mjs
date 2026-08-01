import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("Agamemnon product shell and protected AI route are present", async () => {
  const [app, route, layout, manifest, academicData, messageContent] = await Promise.all([
    readFile(new URL("app/AgamemnonApp.tsx", root), "utf8"),
    readFile(new URL("app/api/chat/route.ts", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("public/manifest.webmanifest", root), "utf8"),
    readFile(new URL("app/academic-data.ts", root), "utf8"),
    readFile(new URL("app/MessageContent.tsx", root), "utf8"),
  ]);

  assert.match(app, /AGAMEMNON/);
  assert.match(app, /Odysseus/);
  assert.match(app, /Day Order engine/);
  assert.match(app, /STEP Class/);
  assert.match(route, /process\.env\.GEMINI_API_KEY/);
  assert.doesNotMatch(app, /GEMINI_API_KEY/);
  assert.match(layout, /Academic Command/);
  assert.equal(JSON.parse(manifest).short_name, "Agamemnon");
  assert.match(app, /MessageContent/);
  assert.match(messageContent, /LatexMath/);
  assert.match(messageContent, /<math/);
  assert.match(academicData, /"13:00",[\s\S]*?"17:00"/);
  assert.match(route, /Saturday STEP runs 1:00 PM–5:00 PM/);
  assert.doesNotMatch(app, /STEP · 12:30 PM–4:30 PM/);
});
