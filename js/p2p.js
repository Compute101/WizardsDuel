'use strict';

// WebRTC DataChannel P2P layer for WizardsDuel.
// Handles offer/answer exchange and message passing; no game logic here.
const WizardsP2P = (() => {
  const STUN = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];
  const GATHER_TIMEOUT = 6000;

  let useStun = false;  // opt-in; local Wi-Fi works without it
  let pc = null, dc = null, _role = null;
  let _onMsg = null, _onOpen = null, _onClose = null;

  function initPC() {
    pc = new RTCPeerConnection({ iceServers: useStun ? STUN : [] });
    pc.oniceconnectionstatechange = () => {
      if (['disconnected','failed','closed'].includes(pc.iceConnectionState)) {
        if (_onClose) _onClose(pc.iceConnectionState);
      }
    };
    return pc;
  }

  function wireChannel(ch) {
    dc = ch;
    ch.onopen    = () => { if (_onOpen) _onOpen(); };
    ch.onmessage = e  => { try { if (_onMsg) _onMsg(JSON.parse(e.data)); } catch(err) { console.error('[p2p] bad msg', err); } };
    ch.onerror   = e  => console.error('[p2p] channel error', e);
  }

  function waitForICE() {
    if (pc.iceGatheringState === 'complete') return Promise.resolve();
    return new Promise(resolve => {
      const tid = setTimeout(resolve, GATHER_TIMEOUT);
      pc.onicegatheringstatechange = () => {
        if (pc.iceGatheringState === 'complete') { clearTimeout(tid); resolve(); }
      };
    });
  }

  function encode(desc) {
    return btoa(JSON.stringify({ type: desc.type, sdp: desc.sdp }))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  function decode(str) {
    const pad = str.length % 4;
    return JSON.parse(atob(
      str.replace(/-/g, '+').replace(/_/g, '/') + (pad ? '='.repeat(4 - pad) : '')
    ));
  }

  async function host() {
    _role = 'host';
    initPC();
    wireChannel(pc.createDataChannel('duel', { ordered: true }));
    await pc.setLocalDescription(await pc.createOffer());
    await waitForICE();
    return encode(pc.localDescription);
  }

  async function acceptAnswer(code) {
    await pc.setRemoteDescription(decode(code));
  }

  async function join(offerCode) {
    _role = 'guest';
    initPC();
    pc.ondatachannel = e => wireChannel(e.channel);
    await pc.setRemoteDescription(decode(offerCode));
    await pc.setLocalDescription(await pc.createAnswer());
    await waitForICE();
    return encode(pc.localDescription);
  }

  function send(obj) {
    if (dc && dc.readyState === 'open') dc.send(JSON.stringify(obj));
  }

  function isOpen() { return !!(dc && dc.readyState === 'open'); }
  function role()   { return _role; }

  function cleanup() {
    try { if (dc) dc.close(); } catch(e) {}
    try { if (pc) pc.close(); } catch(e) {}
    dc = null; pc = null; _role = null;
  }

  return {
    host, join, acceptAnswer, send, isOpen, role, cleanup,
    set useStun(v)    { useStun  = !!v; },
    get useStun()     { return useStun; },
    set onMessage(fn) { _onMsg   = fn; },
    set onOpen(fn)    { _onOpen  = fn; },
    set onClose(fn)   { _onClose = fn; },
  };
})();
