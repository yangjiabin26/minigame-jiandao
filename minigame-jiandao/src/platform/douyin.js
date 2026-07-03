const { AD_UNIT_REWARDED } = require('./config');

function mapTouches(e) {
  return (e.touches.length ? Array.from(e.touches) : Array.from(e.changedTouches))
    .map((t) => ({ id: t.identifier, x: t.clientX, y: t.clientY }));
}
function mapEnded(e) {
  return Array.from(e.changedTouches).map((t) => ({ id: t.identifier, x: t.clientX, y: t.clientY }));
}

function createDouyinPlatform() {
  const info = tt.getSystemInfoSync();
  let rewarded = null;
  const audios = {};
  return {
    name: 'douyin',
    system: { width: info.windowWidth, height: info.windowHeight, pixelRatio: info.pixelRatio },
    createCanvas() { return tt.createCanvas(); },
    storage: {
      get(k) { try { const v = tt.getStorageSync(k); return v === '' ? null : v; } catch (e) { return null; } },
      set(k, v) { try { tt.setStorageSync(k, v); } catch (e) {} },
    },
    ads: {
      showRewarded() {
        if (!AD_UNIT_REWARDED) return Promise.resolve(false);
        return new Promise((resolve) => {
          if (!rewarded) rewarded = tt.createRewardedVideoAd({ adUnitId: AD_UNIT_REWARDED });
          const onClose = (res) => { rewarded.offClose(onClose); resolve(!!(res && res.isEnded)); };
          rewarded.onClose(onClose);
          rewarded.show().catch(() =>
            rewarded.load().then(() => rewarded.show()).catch(() => { rewarded.offClose(onClose); resolve(false); })
          );
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
      onStart(cb) { tt.onTouchStart((e) => cb(mapTouches(e))); },
      onMove(cb) { tt.onTouchMove((e) => cb(mapTouches(e))); },
      onEnd(cb) { tt.onTouchEnd((e) => cb(mapEnded(e))); },
    },
  };
}
module.exports = { createDouyinPlatform };
