// Converts OWASP ZAP's own JSON report (report_json.json, produced by
// zaproxy/action-baseline) into a minimal valid SARIF 2.1.0 document, so
// findings can be uploaded to GitHub's Security tab via upload-sarif.
//
// Written in-house instead of depending on a third-party conversion action
// (SvanBoxel/zaproxy-to-ghas) after that action broke against GitHub's
// current artifact-upload backend - it hasn't been meaningfully maintained
// since 2021. This has no dependencies beyond Node's own fs/path, so there's
// nothing external here to go stale the same way.

import { readFileSync, writeFileSync } from 'node:fs';

const inputPath = process.argv[2] || 'report_json.json';
const outputPath = process.argv[3] || 'zap-results.sarif';

const report = JSON.parse(readFileSync(inputPath, 'utf8'));

// ZAP's riskcode: 3=High, 2=Medium, 1=Low, 0=Informational.
// SARIF only has error/warning/note/none - map High/Medium to error/warning
// (things worth failing a gate on later) and Low/Informational to note.
function levelFor(riskcode) {
  switch (String(riskcode)) {
    case '3': return 'error';
    case '2': return 'warning';
    default: return 'note';
  }
}

const rulesById = new Map();
const results = [];

for (const site of report.site ?? []) {
  for (const alert of site.alerts ?? []) {
    const ruleId = String(alert.pluginid ?? alert.alertRef ?? alert.alert);

    if (!rulesById.has(ruleId)) {
      rulesById.set(ruleId, {
        id: ruleId,
        name: alert.alert,
        shortDescription: { text: alert.alert },
        fullDescription: { text: (alert.desc ?? '').replace(/<[^>]+>/g, '') },
        help: { text: (alert.solution ?? '').replace(/<[^>]+>/g, '') },
        helpUri: alert.reference?.split('\n').find(Boolean)?.trim() || 'https://www.zaproxy.org/',
        properties: { 'security-severity': alert.riskcode, tags: ['security', `cwe-${alert.cweid ?? 'unknown'}`] },
      });
    }

    for (const instance of alert.instances ?? []) {
      results.push({
        ruleId,
        level: levelFor(alert.riskcode),
        message: { text: `${alert.alert}${instance.param ? ` (parameter: ${instance.param})` : ''}` },
        locations: [{
          physicalLocation: {
            artifactLocation: { uri: instance.uri ?? site['@name'] ?? 'unknown' },
          },
        }],
      });
    }
  }
}

const sarif = {
  $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
  version: '2.1.0',
  runs: [{
    tool: {
      driver: {
        name: 'OWASP ZAP',
        informationUri: 'https://www.zaproxy.org/',
        rules: [...rulesById.values()],
      },
    },
    results,
  }],
};

writeFileSync(outputPath, JSON.stringify(sarif, null, 2));
console.log(`Wrote ${results.length} findings across ${rulesById.size} rules to ${outputPath}`);
