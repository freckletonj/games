// Original Wonderwood character and environment art, with Kenney sky details.
import hero from '../../src/assets/characters/hero/sheet.png';
import heroManifest from '../../src/assets/characters/hero/manifest.json';
import springaroo from '../../src/assets/characters/springaroo/sheet.png';
import springManifest from '../../src/assets/characters/springaroo/manifest.json';
import tideling from '../../src/assets/characters/tideling/sheet.webp';
import tideManifest from '../../src/assets/characters/tideling/manifest.json';
import skyling from '../../src/assets/characters/skyling/sheet.webp';
import skyManifest from '../../src/assets/characters/skyling/manifest.json';
import mossback from '../../src/assets/characters/mossback/sheet.webp';
import mossManifest from '../../src/assets/characters/mossback/manifest.json';
import prismtail from '../../src/assets/characters/prismtail/sheet.webp';
import prismManifest from '../../src/assets/characters/prismtail/manifest.json';
import cloudwhisp from '../../src/assets/characters/cloudwhisp/sheet.webp';
import cloudManifest from '../../src/assets/characters/cloudwhisp/manifest.json';
import glimmermoth from '../../src/assets/characters/glimmermoth/sheet.webp';
import mothManifest from '../../src/assets/characters/glimmermoth/manifest.json';
import emberkit from '../../src/assets/characters/emberkit/sheet.webp';
import emberManifest from '../../src/assets/characters/emberkit/manifest.json';
import rockPoses from '../assets/generated/stonewake-hollow/poses/rock-poses.json';
import gravelback from '../assets/generated/stonewake-hollow/gravelback.webp';
import flintfist from '../assets/generated/stonewake-hollow/flintfist.webp';
import unicorn from '../../src/assets/characters/unicorn/sheet.avif';
import unicornManifest from '../../src/assets/characters/unicorn/manifest.json';
import pegasus from '../../src/assets/characters/pegasus/sheet.avif';
import pegasusManifest from '../../src/assets/characters/pegasus/manifest.json';

import meadow from '../../src/assets/scenes/meadow/backdrop.webp';
import coast from '../../src/assets/scenes/coast/backdrop.webp';
import summit from '../../src/assets/scenes/summit/backdrop.webp';
import flora from '../../src/assets/illustrations/flora.webp';
import props from '../../src/assets/illustrations/props.webp';
import effects from '../../src/assets/illustrations/effects.webp';
import states from '../../src/assets/illustrations/states.webp';
import kenneyCloud from '../assets/kenney/cloud1.png';
import kenneyCloudAlt from '../assets/kenney/cloud3.png';
import kenneyMoon from '../assets/kenney/moonFull.png';

const rockManifest={
  frameWidth:160,frameHeight:128,origin:{x:79,y:112},worldScale:.43,
  animations:rockPoses.animations
};

export const characters = {
  hero:{url:hero,manifest:heroManifest},
  springaroo:{url:springaroo,manifest:springManifest},
  tideling:{url:tideling,manifest:tideManifest},
  skyling:{url:skyling,manifest:skyManifest},
  mossback:{url:mossback,manifest:mossManifest},
  prismtail:{url:prismtail,manifest:prismManifest},
  cloudwhisp:{url:cloudwhisp,manifest:cloudManifest},
  glimmermoth:{url:glimmermoth,manifest:mothManifest},
  emberkit:{url:emberkit,manifest:emberManifest},
  gravelback:{url:gravelback,manifest:rockManifest},
  flintfist:{url:flintfist,manifest:rockManifest}
};
export const mounts = {
  unicorn:{url:unicorn,manifest:unicornManifest},
  pegasus:{url:pegasus,manifest:pegasusManifest}
};
export const backgrounds = {meadow,coast,summit};
export const sheets = {flora,props,effects};
export const paintedStates=states;
export const silhouettes = {
  cloud:kenneyCloud,cloudAlt:kenneyCloudAlt,moon:kenneyMoon
};
