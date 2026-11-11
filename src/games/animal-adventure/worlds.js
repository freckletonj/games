window.WW = window.WW || {};
// One canonical, declarative source for authored worlds. The same compiler
// runs in the browser and in Node's headless level-inspector.
WW.worlds = (() => {
  const designs = window.WW_EMBEDDED_DESIGNS;
  function create(chapter) {
    const design = designs[chapter.id];
    if (!design) throw Error('Unknown world: ' + chapter.id);
    return WW.worldCompiler.compile(design, chapter);
  }
  const summary = Object.fromEntries(Object.values(designs).map(design => [
    design.id, {
      width: design.width, height: design.height,
      relic: design.relic[0], creatures: design.creatures.length,
      sections: design.sections.length
    }
  ]));
  return {create, summary};
})();
