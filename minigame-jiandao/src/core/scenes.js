function createSceneManager() {
  const scenes = {};
  let current = null;
  return {
    register(name, scene) { scenes[name] = scene; },
    go(name, params = {}) {
      if (current && current.exit) current.exit();
      current = scenes[name];
      if (current.enter) current.enter(params);
    },
    update(dt) { if (current && current.update) current.update(dt); },
    render(ctx) { if (current && current.render) current.render(ctx); },
    tap(x, y) { if (current && current.onTap) current.onTap(x, y); },
  };
}
module.exports = { createSceneManager };
