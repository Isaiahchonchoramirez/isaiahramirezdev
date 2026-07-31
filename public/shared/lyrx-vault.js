/**
 * Shared store for material DataCore collects and Lyrx plays.
 *
 * DataCore (/datacore/) and Lyrx (/lyrx/) are served from the same origin, so
 * they share one IndexedDB. DataCore writes; Lyrx reads. Audio Blobs go here
 * because localStorage would choke on them at ~5MB, and unlike Lyrx's in-memory
 * pad buffers these survive a reload.
 *
 * window.LyrxVault
 *   put(item)          -> id        item: {kind:'text'|'sample', title, …}
 *   all()              -> item[]    newest first, blobs included
 *   list()             -> item[]    newest first, metadata only (no blobs)
 *   get(id) / remove(id) / clear()
 *   count()            -> {text, sample, bytes}
 */
(function () {
  const DB = 'lyrx-vault';
  const STORE = 'items';
  // Deliberately still 1. DataCore and Lyrx are separate pages holding this same
  // database open, and an upgrade cannot commit until every one of them closes —
  // including tabs in other windows nobody remembers opening. A bump therefore
  // risks hanging both apps rather than improving either, so dedupe is done with
  // a deterministic key instead of a new index.
  const VERSION = 1;

  let dbp = null;
  function open() {
    if (dbp) return dbp;
    dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB, VERSION);

      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const os = db.createObjectStore(STORE, { keyPath: 'id' });
          os.createIndex('kind', 'kind');
          os.createIndex('addedAt', 'addedAt');
        }
      };

      // DataCore and Lyrx share this database, so at an upgrade one of them is
      // usually holding the old version open. Without this the request neither
      // succeeds nor errors — it simply blocks, and every await behind it hangs
      // forever, which looks exactly like the page having frozen.
      req.onblocked = () => {
        reject(new Error('The vault is open in another DataCore or Lyrx tab — close it and reload.'));
      };

      req.onsuccess = () => {
        // Let a newer version elsewhere upgrade instead of blocking on us.
        req.result.onversionchange = () => { try { req.result.close(); } catch (e) { /* gone */ } dbp = null; };
        resolve(req.result);
      };
      req.onerror = () => reject(req.error);
    });
    // A failed open must not be cached, or one bad moment poisons the session.
    dbp.catch(() => { dbp = null; });
    return dbp;
  }

  function tx(mode, fn) {
    return open().then(db => new Promise((resolve, reject) => {
      const t = db.transaction(STORE, mode);
      const store = t.objectStore(STORE);
      let out;
      try { out = fn(store); } catch (e) { reject(e); return; }
      t.oncomplete = () => resolve(out && out.result !== undefined ? out.result : out);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    }));
  }

  const newId = () => 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  /**
   * One id per source URL, so sending the same track twice overwrites the first
   * copy instead of leaving two identical cards in the Library. The URL itself
   * is the key — a hash would be shorter but could collide, and this stays
   * readable when inspecting the database by hand.
   */
  const idFor = item => (item.url ? 'u:' + item.url : newId());
  const strip = ({ blob, text, ...meta }) => ({ ...meta, preview: (text || '').slice(0, 240) });

  window.LyrxVault = {
    async put(item) {
      const rec = {
        id: item.id || idFor(item),
        kind: item.kind === 'sample' ? 'sample' : 'text',
        title: item.title || 'untitled',
        url: item.url || '',
        license: item.license || 'unknown',
        source: item.source || 'DataCore',
        addedAt: item.addedAt || Date.now(),
        bytes: item.bytes || (item.blob ? item.blob.size : (item.text || '').length),
        mime: item.mime || (item.kind === 'sample' ? 'audio/mpeg' : 'text/plain'),
        text: item.text || '',
        blob: item.blob || null,
      };
      await tx('readwrite', s => s.put(rec));
      return rec.id;
    },

    all() {
      return tx('readonly', s => s.getAll())
        .then(rows => (rows || []).sort((a, b) => b.addedAt - a.addedAt));
    },

    list() {
      return this.all().then(rows => rows.map(strip));
    },

    get(id) {
      return tx('readonly', s => s.get(id));
    },

    remove(id) {
      return tx('readwrite', s => s.delete(id));
    },

    clear() {
      return tx('readwrite', s => s.clear());
    },

    count() {
      return this.all().then(rows => ({
        text: rows.filter(r => r.kind === 'text').length,
        sample: rows.filter(r => r.kind === 'sample').length,
        bytes: rows.reduce((n, r) => n + (r.bytes || 0), 0),
      }));
    },
  };
})();
