/*
 * Retro Console bridge. Runs inside a same-origin iframe so the emulator is fully
 * torn down (audio, loops, listeners) when the arcade removes the iframe.
 * The ROM arrives from the parent page via postMessage; it is never fetched from or sent to a server.
 */
(function () {
  'use strict';
  var parentOrigin = window.location.origin;
  var started = false;

  function send(msg, transfer) {
    window.parent.postMessage(msg, parentOrigin, transfer || []);
  }
  function emu() {
    return window.EJS_emulator;
  }
  function toBuffer(u8) {
    return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
  }

  var CORES = { nes: 'nes', snes: 'snes' };

  function init(msg) {
    if (window.EJS_emulator || !CORES[msg.system]) return;
    var rom = new Blob([msg.rom]);
    window.EJS_player = '#game';
    window.EJS_core = CORES[msg.system];
    window.EJS_gameUrl = URL.createObjectURL(rom);
    window.EJS_gameName = 'game';
    window.EJS_pathtodata = 'data/';
    window.EJS_DEBUG_XX = true; // load the unminified sources we ship
    window.EJS_startOnLoaded = true;
    window.EJS_disableDatabases = true; // ROMs live in the arcade's own storage
    window.EJS_disableAutoLang = false;
    window.EJS_language = 'en-US';
    window.EJS_color = '#7357FF';
    window.EJS_backgroundColor = '#000000';
    window.EJS_volume = typeof msg.volume === 'number' ? msg.volume : 0.5;
    window.EJS_Buttons = {
      saveState: false,
      loadState: false,
      quickSave: false,
      quickLoad: false,
      saveSavFiles: false,
      loadSavFiles: false,
      screenRecord: false,
      screenshot: false,
      cheat: false,
      netplay: false,
      cacheManager: false,
      exitEmulation: false,
      diskButton: false,
      contextMenu: false,
    };
    window.EJS_ready = function () {
      send({ type: 'loaded' });
    };
    window.EJS_onGameStart = function () {
      started = true;
      if (msg.state) {
        try {
          emu().gameManager.loadState(new Uint8Array(msg.state));
        } catch (e) {
          send({ type: 'error', message: 'Could not restore the saved spot.' });
        }
      }
      if (msg.muted) emu().setVolume(0);
      send({ type: 'started' });
    };
    var s = document.createElement('script');
    s.src = 'data/loader.js';
    s.onerror = function () {
      send({ type: 'error', message: 'The retro console could not load.' });
    };
    document.body.appendChild(s);
  }

  window.addEventListener('message', function (e) {
    if (e.origin !== parentOrigin || e.source !== window.parent) return;
    var msg = e.data || {};
    var em = emu();
    try {
      switch (msg.type) {
        case 'init':
          init(msg);
          break;
        case 'pause':
          if (em && started) em.pause();
          break;
        case 'resume':
          if (em && started) em.play();
          break;
        case 'restart':
          if (em && started) em.gameManager.restart();
          break;
        case 'setVolume':
          if (em && started) em.setVolume(msg.muted ? 0 : msg.volume);
          break;
        case 'saveState': {
          if (!em || !started) return send({ type: 'state', reqId: msg.reqId, error: 'not-started' });
          var state = em.gameManager.getState();
          var buf = toBuffer(state);
          send({ type: 'state', reqId: msg.reqId, state: buf }, [buf]);
          break;
        }
        case 'loadState':
          if (em && started) em.gameManager.loadState(new Uint8Array(msg.state));
          send({ type: 'stateLoaded', reqId: msg.reqId });
          break;
      }
    } catch (err) {
      send({ type: 'error', message: String((err && err.message) || err), reqId: msg.reqId });
    }
  });

  window.addEventListener('error', function (e) {
    send({ type: 'error', message: String(e.message || 'error') });
  });

  send({ type: 'ready' });
})();
