function createPool(make) {
  const items = [];
  return {
    obtain() {
      for (const o of items) if (!o.__active) { o.__active = true; return o; }
      const o = make();
      o.__active = true;
      items.push(o);
      return o;
    },
    free(o) { o.__active = false; },
    forEach(fn) { for (const o of items) if (o.__active) fn(o); },
    clear() { for (const o of items) o.__active = false; },
    size() { let n = 0; for (const o of items) if (o.__active) n++; return n; },
  };
}
module.exports = { createPool };
