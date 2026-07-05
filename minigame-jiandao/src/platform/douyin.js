const { AD_UNIT_REWARDED } = require('./config');

function mapTouches(e) {
  return (e.touches.length ? Array.from(e.touches) : Array.from(e.changedTouches))
    .map((t) => ({ id: t.identifier, x: t.clientX, y: t.clientY }));
}
function mapChanged(e) {
  return Array.from(e.changedTouches).map((t) => ({ id: t.identifier, x: t.clientX, y: t.clientY }));
}

let mainCanvas = null;

function createDouyinPlatform() {
  const info = tt.getSystemInfoSync();
  let rewarded = null;
  const audios = {};
  return {
    name: 'douyin',
    system: { width: info.windowWidth, height: info.windowHeight, pixelRatio: info.pixelRatio },
    createCanvas() { mainCanvas = mainCanvas || tt.createCanvas(); return mainCanvas; },
    storage: {
      get(k) { try { const v = tt.getStorageSync(k); return v === '' ? null : v; } catch (e) { return null; } },
      set(k, v) { try { tt.setStorageSync(k, v); } catch (e) {} },
    },
    ads: {
      available() { return !!AD_UNIT_REWARDED; },
      showRewarded() {
        if (!AD_UNIT_REWARDED) return Promise.resolve(false);
        return new Promise((resolve) => {
          try {
            if (!rewarded) rewarded = tt.createRewardedVideoAd({ adUnitId: AD_UNIT_REWARDED });
            const onClose = (res) => { rewarded.offClose(onClose); resolve(!!(res && res.isEnded)); };
            rewarded.onClose(onClose);
            try {
              rewarded.show().catch(() =>
                rewarded.load().then(() => rewarded.show()).catch(() => { rewarded.offClose(onClose); resolve(false); })
              );
            } catch (e) { rewarded.offClose(onClose); resolve(false); }
          } catch (e) { resolve(false); }
        });
      },
    },
    share({ title, desc }) { tt.shareAppMessage({ title, desc }); },
    audio: {
      play(name) {
        if (!audios[name]) {
          const a = tt.createInnerAudioContext();
          a.src = 'assets/audio/' + name + '.mp3';
          audios[name] = a;
        }
        audios[name].stop(); audios[name].play();
      },
      stopAll() { Object.keys(audios).forEach((k) => audios[k].stop()); },
    },
    recorder: {
      start() { try { tt.getGameRecorderManager().start({ duration: 300 }); } catch (e) {} },
      stop() { try { tt.getGameRecorderManager().stop(); } catch (e) {} },
    },
    onError(cb) { tt.onError(cb); },
    touch: {
      onStart(cb) { tt.onTouchStart((e) => cb(mapChanged(e))); },
      onMove(cb) { tt.onTouchMove((e) => cb(mapTouches(e))); },
      onEnd(cb) { tt.onTouchEnd((e) => cb(mapChanged(e))); },
    },
    createImage() { return (mainCanvas || (mainCanvas = tt.createCanvas())).createImage(); },
    readJson(p) {
      try { return JSON.parse(tt.getFileSystemManager().readFileSync(p, 'utf8')); } catch (e) { return null; }
    },
  };
}
module.exports = { createDouyinPlatform };
