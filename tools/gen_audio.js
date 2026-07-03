#!/usr/bin/env node
/**
 * gen_audio.js — 零依赖 WAV 音效合成器（回退方案）
 *
 * 用途：当无法从 kenney.nl 下载 CC0 音效素材时，用本脚本合成 6 个
 * 22050Hz / 16-bit / 单声道占位 WAV 音效，写入
 * minigame-jiandao/assets/audio/*.wav。
 *
 * 当前仓库实际使用的是 Kenney CC0 mp3（见 minigame-jiandao/assets/README.md），
 * 本脚本仅作为备用工具保留，未在正常构建流程中调用。
 *
 * 若切换为本脚本生成的 .wav，需要同步修改
 * minigame-jiandao/src/platform/douyin.js 中构造音频路径的
 * `'.mp3'` 后缀为 `'.wav'`（抖音小游戏 InnerAudioContext 同时支持
 * mp3 与 wav 格式）。
 *
 * 用法：node tools/gen_audio.js
 */

'use strict';

const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 22050;
const OUT_DIR = path.join(__dirname, '..', 'minigame-jiandao', 'assets', 'audio');

function fadeGain(i, n, fadeSamples) {
  if (i < fadeSamples) return i / fadeSamples;
  if (i > n - fadeSamples) return Math.max(0, (n - i) / fadeSamples);
  return 1;
}

function makeSamples(durationSec, fn) {
  const n = Math.floor(SAMPLE_RATE * durationSec);
  const fadeSamples = Math.max(1, Math.floor(SAMPLE_RATE * 0.005)); // ~5ms
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    samples[i] = fn(t, i, n) * fadeGain(i, n, fadeSamples);
  }
  return samples;
}

function sweepDown(f0, f1, dur) {
  return makeSamples(dur, (t) => {
    const freq = f0 + (f1 - f0) * (t / dur);
    return Math.sin(2 * Math.PI * freq * t) * (1 - t / dur * 0.3);
  });
}

function thudWithNoise(freq, dur) {
  return makeSamples(dur, (t) => {
    const tone = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 30);
    const noise = (Math.random() * 2 - 1) * Math.exp(-t * 40) * 0.6;
    return tone * 0.7 + noise;
  });
}

function sawHurt(freq, dur) {
  return makeSamples(dur, (t) => {
    const phase = (freq * t) % 1;
    const saw = 2 * phase - 1;
    return saw * Math.exp(-t * 6);
  });
}

function whooshNoise(dur) {
  return makeSamples(dur, (t) => {
    const env = Math.sin(Math.PI * (t / dur)); // rise then fall
    return (Math.random() * 2 - 1) * env;
  });
}

function coinTwoTone(f0, f1, dur) {
  return makeSamples(dur, (t) => {
    const half = dur / 2;
    const freq = t < half ? f0 : f1;
    return Math.sin(2 * Math.PI * freq * t) * Math.exp(-((t % half)) * 12);
  });
}

function dieDescent(f0, f1, dur) {
  return makeSamples(dur, (t) => {
    const freq = f0 + (f1 - f0) * (t / dur);
    return Math.sin(2 * Math.PI * freq * t) * (1 - t / dur) * 0.9;
  });
}

function floatTo16BitPCM(samples) {
  const buf = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    let s = Math.max(-1, Math.min(1, samples[i]));
    s = s < 0 ? s * 0x8000 : s * 0x7fff;
    buf.writeInt16LE(Math.round(s), i * 2);
  }
  return buf;
}

function writeWavFile(filePath, samples) {
  const dataBuf = floatTo16BitPCM(samples);
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = SAMPLE_RATE * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;

  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataBuf.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // fmt chunk size
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataBuf.length, 40);

  fs.writeFileSync(filePath, Buffer.concat([header, dataBuf]));
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const sounds = {
    attack: sweepDown(600, 200, 0.09),
    hit: thudWithNoise(150, 0.08),
    hurt: sawHurt(220, 0.15),
    dash: whooshNoise(0.12),
    coin: coinTwoTone(988, 1319, 0.12),
    die: dieDescent(400, 80, 0.4),
  };

  for (const [name, samples] of Object.entries(sounds)) {
    const outPath = path.join(OUT_DIR, name + '.wav');
    writeWavFile(outPath, samples);
    console.log('wrote', outPath, samples.length, 'samples');
  }
}

main();
