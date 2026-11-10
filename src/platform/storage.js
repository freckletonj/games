window.WW = window.WW || {};
WW.storage = (() => {
  const KEY = 'wonderwood-save-v1';
  const initial = () => ({ settings: { rumble: true, sound: true, players: 1 }, profiles: {}, progress: { wins: 0 } });
  let data = initial();
  function load() {
    const stored = localStorage.getItem(KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      data = { ...initial(), ...parsed, settings: { ...initial().settings, ...parsed.settings } };
    }
    return data;
  }
  function save() { localStorage.setItem(KEY, JSON.stringify(data)); }
  function exportSave() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'wonderwood-save.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function importSave(file) {
    const incoming = JSON.parse(await file.text());
    if (!incoming || typeof incoming !== 'object' || !incoming.settings || !incoming.profiles) throw Error('Not a Wonderwood save file');
    data = { ...initial(), ...incoming, settings: { ...initial().settings, ...incoming.settings } }; save();
  }
  return { load, save, exportSave, importSave, get data() { return data; } };
})();
