// The /example topbar, menu, footer and grid overlay are template literals in
// chrome.js, injected at runtime, so `html-validate "**/*.html"` never sees the
// most-repeated markup on the example site. This pulls each template out and
// runs it through the same .htmlvalidate.json the pages use.
//
// Each template is validated inside a minimal document, so rules that need one
// (heading-level, landmark placement) have the context they expect. Line numbers
// are reported against that wrapper, not chrome.js; the offending markup is
// quoted, which is enough to find it in the template.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { HtmlValidate } from "html-validate";

const SOURCE = "demo/example/chrome.js";
const TEMPLATES = ["TOPBAR", "MENU", "FOOTER", "GRID_OVERLAY"];

const js = readFileSync(SOURCE, "utf8");
// The project config, read rather than discovered, so these templates are held
// to exactly the rules the pages they are injected into are held to.
const config = JSON.parse(readFileSync(".htmlvalidate.json", "utf8"));
const htmlValidate = new HtmlValidate({ root: true, ...config });

let failed = false;
for (const name of TEMPLATES) {
  const match = js.match(new RegExp("const " + name + "\\s*=\\s*`([\\s\\S]*?)`;", "m"));
  if (!match) {
    console.error(`${SOURCE}: template ${name} not found (renamed or removed?)`);
    failed = true;
    continue;
  }
  const doc = `<!doctype html>\n<html lang="en">\n<head><meta charset="utf-8"><title>${name}</title></head>\n<body>\n${match[1]}\n</body>\n</html>\n`;
  const report = await htmlValidate.validateString(doc, resolve(`${SOURCE}.${name}.html`));
  if (report.valid) continue;
  failed = true;
  for (const result of report.results) {
    for (const m of result.messages) {
      console.error(`${SOURCE} (${name}) line ${m.line}: ${m.message}  [${m.ruleId}]`);
      if (m.selector) console.error(`    at ${m.selector}`);
    }
  }
}

if (failed) process.exitCode = 1;
else console.log(`${TEMPLATES.length} chrome templates valid`);
