/*
 * LCZero loader for browser — adapted from lc0-js (frpays/lc0-js)
 * Provides CreateLC0Worker() which returns a Promise<Worker>
 * The worker speaks standard UCI via postMessage/onmessage.
 *
 * Requires: tensorflow.js (loaded via CDN in index.html)
 *
 * Usage:
 *   const worker = await CreateLC0Worker();
 *   worker.onmessage = (e) => console.log('LC0:', e.data);
 *   worker.postMessage('load weights.txt.gz');  // load neural network
 *   worker.postMessage('uci');
 *   worker.postMessage('isready');
 *   worker.postMessage('position fen ...');
 *   worker.postMessage('go movetime 3000');
 */

let useWebWorker = 'undefined' != typeof OffscreenCanvas;

if (useWebWorker) {
  // Modern browsers (Chrome, Edge): run LC0 in a dedicated Web Worker
  // OffscreenCanvas lets tensorflow.js use WebGL inside the worker
  window.CreateLC0Worker = function() {
    return new Promise(function(resolve, reject) {
      const worker = new Worker('lc0/lc0.js');
      worker.onerror = function(err) {
        console.error('❌ LCZero worker error:', err);
        reject(err);
      };
      // Give the worker a moment to initialize, then resolve
      worker.onmessage = function(e) {
        // Worker sends 'ready' when initialized
        if (e.data === 'ready') {
          resolve(worker);
        }
      };
      // Fallback: resolve after a short delay if 'ready' message isn't sent
      setTimeout(function() {
        resolve(worker);
      }, 500);
    });
  };

} else {
  // Safari / older browsers: load LC0 inline (no OffscreenCanvas support)
  // The engine runs in the main thread; UI may be less responsive

  function readFileAsText(url) {
    return new Promise(function(resolve, reject) {
      console.info('📦 Loading ' + url);
      const req = new XMLHttpRequest();
      req.open('GET', url);
      req.onload = function() {
        if (req.status === 200) resolve(req.responseText);
        else reject(Error(req.statusText));
      };
      req.onerror = function() {
        reject(Error('Network Error'));
      };
      req.send();
    });
  }

  function createWorkerScript(text) {
    const beg = `
const LC0Worker = function() {
  let worker = {
    postMessage: function(message) {
      if (!onmessage) return;
      onmessage({data: message});
    },
    terminate: function() { /* no-op for inline mode */ },
    onmessage: null,
    onerror: null,
  };
  function postMessage(message) {
    const callback = worker.onmessage;
    if (!callback) return;
    callback({data: message});
  }
  function setTerminate(callback) {
    worker.terminate = callback;
  }
  `;
    const end = `
  return worker;
};
  `;
    return { id: 'lc0', text: beg + text + end };
  }

  function loadScript(params) {
    return new Promise(function(resolve, reject) {
      const elementId = '__script__' + params.id;
      if (document.getElementById(elementId)) {
        resolve();
        return;
      }
      const head = document.getElementsByTagName('head')[0] || document.documentElement;
      const script = document.createElement('script');
      script.id = elementId;
      script.type = 'text/javascript';
      if (params.url) {
        script.src = params.url;
        script.onload = function() { resolve(); };
        script.onerror = function() { reject('Could not load ' + params.url); };
      }
      if (params.text) {
        script.text = params.text;
      }
      head.appendChild(script);
      if (params.text) resolve();
    });
  }

  window.CreateLC0Worker = function() {
    return new Promise(function(resolve, reject) {
      readFileAsText('lc0/lc0.js')
        .then(createWorkerScript)
        .then(loadScript)
        .then(function() {
          resolve(new LC0Worker());
        })
        .catch(function(err) {
          reject(err);
        });
    });
  };
}
