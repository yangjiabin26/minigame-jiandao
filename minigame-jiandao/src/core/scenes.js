function createSceneManager() {
  const scenes = {};
  let current = null;
  return {
    register(name, scene) { scenes[name] = scene; },
    go(name, params = {}) {
      const next = scenes[name];
      if (!next) throw new Error('未注册的场景: ' + name);
      if (current && current.exit) current.exit();
      current = next;
      if (current.enter) current.enter(params);
    },
    update(dt) { if (current && current.update) current.update(dt); },
    render(ctx) { if (current && current.render) current.render(ctx); },
    tap(x, y) { if (current && current.onTap) current.onTap(x, y); },
  };
}
module.exports = { createSceneManager };
