// CI and local LLM tooling can inspect quantitative gameplay outcomes
// without launching Phaser or manually judging an animation.
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {qualityReport} from '../tests/quality-scenarios.mjs';

const destination=resolve(import.meta.dirname,'../../dist/phaser-mechanics-quality.json');
mkdirSync(resolve(import.meta.dirname,'../../dist'),{recursive:true});
writeFileSync(destination,JSON.stringify(qualityReport(),null,2)+'\n');
console.log('Wrote gameplay quality metrics to '+destination);
