import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import ModalShell from './ModalShell';
import InstallBanner from './InstallBanner';
import { CloseIcon, ShareIcon } from './Icons';

const normalizeRoomCode = (value) => value.trim().toUpperCase();
const isRoomCode = (value) => /^[A-HJ-NP-Z2-9]{6}$/.test(value);
const pillButton = { borderRadius: 999 };
const normalizeName = (value) => value.toUpperCase();
const getCapturedInstallPrompt = () => window.__diguInstallPrompt || null;

export default function Lobby({ socket, onJoined }) {
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [mode, setMode] = useState(null); // null | 'create' | 'join'
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanError, setScanError] = useState('');
  const [installDismissed, setInstallDismissed] = useState(false);
  const [iosInstallOpen, setIosInstallOpen] = useState(false);
  const [androidInstallOpen, setAndroidInstallOpen] = useState(false);
  const [hasInstallPrompt, setHasInstallPrompt] = useState(() => Boolean(getCapturedInstallPrompt()));
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const scannerRef = useRef(null);
  const scannerRegionId = 'digu-qr-scanner';
  const deferredInstallPromptRef = useRef(null);

  const isStandalone = window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator.standalone;
  const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  const isAndroid = /android/i.test(window.navigator.userAgent);
  const isSafari = /^((?!chrome|android).)*safari/i.test(window.navigator.userAgent);
  const canShowIosInstall = isIos && isSafari && !isStandalone;

  useEffect(() => {
    if (!scannerOpen) return undefined;

    let cancelled = false;
    let started = false;
    const scanner = new Html5Qrcode(scannerRegionId);
    scannerRef.current = scanner;

    const cleanupScanner = () => {
      if (!started) {
        return Promise.resolve()
          .then(() => scanner.clear())
          .catch(() => {});
      }

      return scanner.stop()
        .then(() => scanner.clear())
        .catch(() => scanner.clear().catch(() => {}));
    };

    const startPromise = scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 220, height: 220 } },
      (decodedText) => {
        if (cancelled) return;
        const normalized = normalizeRoomCode(decodedText);

        if (!isRoomCode(normalized)) {
          setScanError('That QR code is not a Digu room code.');
          return;
        }

        setRoomCode(normalized);
        setScannerOpen(false);
        setScanError('');
      },
      () => {}
    );

    startPromise.then(() => {
      started = true;
      if (cancelled) cleanupScanner();
    }).catch(() => {
      if (cancelled) return;
      setScannerOpen(false);
      setScanError('Camera scanner is unavailable. Enter the room code manually.');
    });

    return () => {
      cancelled = true;
      cleanupScanner();
    };
  }, [scannerOpen]);

  useEffect(() => {
    const syncCapturedInstallPrompt = () => {
      const capturedPrompt = getCapturedInstallPrompt();
      if (!capturedPrompt) return;

      deferredInstallPromptRef.current = capturedPrompt;
      setHasInstallPrompt(true);
    };

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      window.__diguInstallPrompt = event;
      window.__diguInstallPromptSeen = true;
      deferredInstallPromptRef.current = event;
      setHasInstallPrompt(true);
    };

    syncCapturedInstallPrompt();
    window.addEventListener('digu-beforeinstallprompt', syncCapturedInstallPrompt);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('digu-beforeinstallprompt', syncCapturedInstallPrompt);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    if (!window.visualViewport) return undefined;

    const updateKeyboardState = () => {
      const viewport = window.visualViewport;
      setKeyboardOpen(viewport.height < window.innerHeight - 120);
    };

    updateKeyboardState();
    window.visualViewport.addEventListener('resize', updateKeyboardState);
    window.visualViewport.addEventListener('scroll', updateKeyboardState);

    return () => {
      window.visualViewport.removeEventListener('resize', updateKeyboardState);
      window.visualViewport.removeEventListener('scroll', updateKeyboardState);
    };
  }, []);

  const openInstall = async () => {
    if (canShowIosInstall) {
      setIosInstallOpen(true);
      return;
    }

    const promptEvent = deferredInstallPromptRef.current || getCapturedInstallPrompt();
    if (!promptEvent) {
      if (isAndroid) setAndroidInstallOpen(true);
      return;
    }

    promptEvent.prompt();
    try {
      await promptEvent.userChoice;
    } finally {
      deferredInstallPromptRef.current = null;
      window.__diguInstallPrompt = null;
      window.__diguInstallPromptSeen = false;
      setHasInstallPrompt(false);
      setInstallDismissed(true);
    }
  };

  const handleCreate = () => {
    if (!name.trim()) return setError('Enter your name.');
    setLoading(true);
    socket.emit('createRoom', { playerName: name.trim() }, (res) => {
      setLoading(false);
      if (res.success) {
        onJoined({ roomCode: res.roomCode, playerId: res.playerId, playerName: name.trim() });
      } else {
        setError(res.error);
      }
    });
  };

  const handleJoin = () => {
    if (!name.trim()) return setError('Enter your name.');
    if (!roomCode.trim()) return setError('Enter a room code.');
    setLoading(true);
    socket.emit('joinRoom', { roomCode: roomCode.trim().toUpperCase(), playerName: name.trim() }, (res) => {
      setLoading(false);
      if (res.success) {
        onJoined({ roomCode: res.roomCode, playerId: res.playerId, playerName: name.trim() });
      } else {
        setError(res.error);
      }
    });
  };

  const inputStyle = {
    background: '#0d1520',
    border: '1.5px solid #1e2d45',
    borderRadius: 999,
    color: '#e8e0d4',
    padding: '12px 16px',
    fontSize: 18,
    width: '100%',
    transition: 'border-color 0.2s',
    textAlign: 'center',
  };

  const btnPrimary = {
    background: 'linear-gradient(135deg, #c9a84c, #e8c96a)',
    color: '#0a0f1e',
    fontWeight: 700,
    fontSize: 15,
    padding: '13px 0',
    ...pillButton,
    width: '100%',
    letterSpacing: '0.03em',
    transition: 'opacity 0.2s',
    cursor: 'pointer',
  };

  const btnSecondary = {
    background: 'transparent',
    border: '1.5px solid #1e2d45',
    color: '#8a9bb5',
    fontWeight: 500,
    fontSize: 14,
    padding: '10px 0',
    ...pillButton,
    width: '100%',
    cursor: 'pointer',
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: keyboardOpen ? 'flex-start' : 'center',
      justifyContent: 'center',
      padding: keyboardOpen ? '20px 24px 32px' : 24,
      background: 'radial-gradient(ellipse at 60% 20%, #1a2a4a 0%, #0a0f1e 70%)',
      textTransform: 'uppercase',
      overflowY: 'auto',
    }}>
      <div style={{ width: '100%', maxWidth: 400, paddingBottom: 140, marginTop: keyboardOpen ? 8 : 0 }} className="slide-up">

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <img
            src="/digu-logo.png"
            alt="Digu"
            style={{
              width: 'min(260px, 78vw)',
              height: 'auto',
              display: 'block',
              margin: '0 auto',
              filter: 'drop-shadow(0 18px 34px rgba(0,0,0,0.28))',
            }}
          />
          <p style={{ color: '#8a9bb5', marginTop: 8, fontSize: 14, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Gin Rummy — Maldives Edition
          </p>
        </div>

        {/* Mode: null — just two buttons */}
        {mode === null && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }} className="fade-in">
            <button style={btnPrimary} onClick={() => { setMode('create'); setError(''); }}>
              Create Room
            </button>
            <button style={{ ...btnPrimary, background: 'transparent', border: '1.5px solid #c9a84c', color: '#c9a84c' }}
              onClick={() => { setMode('join'); setError(''); }}>
              Join Room
            </button>
            <p style={{ color: '#3a4a65', textAlign: 'center', marginTop: 8, fontSize: 12 }}>
              2–5 players · Share the room code with friends
            </p>
          </div>
        )}

        {/* Mode: create */}
        {mode === 'create' && (
          <div style={{ background: '#111827', border: '1px solid #1e2d45', borderRadius: 16, padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }} className="fade-in">
            <div>
              <label style={{ color: '#8a9bb5', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>
                Your Name
              </label>
              <input
                style={inputStyle}
                placeholder="Enter your name"
                value={name}
                onChange={e => { setName(normalizeName(e.target.value)); setError(''); }}
                maxLength={20}
                autoFocus
              />
            </div>
            {error && <div style={{ color: '#e05252', fontSize: 13, textAlign: 'center' }}>{error}</div>}
            <button style={btnPrimary} onClick={handleCreate} disabled={loading}>
              {loading ? 'Creating...' : 'Create Room'}
            </button>
            <button style={btnSecondary} onClick={() => { setMode(null); setError(''); setName(''); }}>
              Back
            </button>
          </div>
        )}

        {/* Mode: join */}
        {mode === 'join' && (
          <div style={{ background: '#111827', border: '1px solid #1e2d45', borderRadius: 16, padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }} className="fade-in">
            <div>
              <label style={{ color: '#8a9bb5', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>
                Your Name
              </label>
              <input
                style={inputStyle}
                placeholder="Enter your name"
                value={name}
                onChange={e => { setName(normalizeName(e.target.value)); setError(''); }}
                maxLength={20}
                autoFocus
              />
            </div>
            <div>
              <label style={{ color: '#8a9bb5', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>
                Room Code
              </label>
              <input
                style={{ ...inputStyle, textTransform: 'uppercase', letterSpacing: '0.15em', fontSize: 20, textAlign: 'center' }}
                placeholder="XXXXXX"
                value={roomCode}
                onChange={e => { setRoomCode(e.target.value.toUpperCase()); setError(''); }}
                maxLength={6}
              />
              <button
                type="button"
                style={{ ...btnSecondary, marginTop: 10 }}
                onClick={() => { setScannerOpen(true); setScanError(''); }}
              >
                Scan QR
              </button>
            </div>
            {error && <div style={{ color: '#e05252', fontSize: 13, textAlign: 'center' }}>{error}</div>}
            {scanError && <div style={{ color: '#e05252', fontSize: 12, textAlign: 'center' }}>{scanError}</div>}
            <button style={btnPrimary} onClick={handleJoin} disabled={loading}>
              {loading ? 'Joining...' : 'Join Room'}
            </button>
            <button style={btnSecondary} onClick={() => { setMode(null); setError(''); setName(''); setRoomCode(''); }}>
              Back
            </button>
          </div>
        )}

      </div>
      {scannerOpen && (
        <ModalShell onClose={() => setScannerOpen(false)} maxWidth={380}>
          <div style={{ textTransform: 'uppercase' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ color: '#c9a84c', fontSize: 18, fontWeight: 800 }}>Scan QR</h2>
              <button
                style={{ background: 'transparent', border: 'none', borderRadius: 999, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => setScannerOpen(false)}
                aria-label="Close scanner"
              >
                <CloseIcon />
              </button>
            </div>
            <div id={scannerRegionId} style={{ width: '100%', minHeight: 260, overflow: 'hidden', borderRadius: 16 }} />
            <p style={{ color: '#8a9bb5', fontSize: 12, marginTop: 12, textAlign: 'center' }}>
              Scan the room QR code. You can still enter the code manually.
            </p>
          </div>
        </ModalShell>
      )}
      {iosInstallOpen && (
        <ModalShell onClose={() => setIosInstallOpen(false)} maxWidth={520}>
          <div style={{ textTransform: 'uppercase' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <img src="/app-icon-192.png" alt="" width="52" height="52" style={{ borderRadius: 14, background: '#0a0f1e' }} />
                <div>
                  <h2 style={{ color: '#c9a84c', fontSize: 22, fontWeight: 800 }}>Install Digu</h2>
                </div>
              </div>
              <button
                onClick={() => setIosInstallOpen(false)}
                aria-label="Close install instructions"
                style={{ background: 'transparent', border: 'none', borderRadius: 999, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <CloseIcon />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, color: '#0a0f1e', fontSize: 15, lineHeight: 1.45 }}>
              {[
                ['1', <>Tap the <strong>Share</strong> button in Safari</>],
                ['2', <>Scroll down and tap <strong>Add to Home Screen</strong></>],
                ['3', <>Tap <strong>Add</strong> to confirm</>],
              ].map(([step, text]) => (
                <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(76,175,136,0.12)', color: '#4caf88', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>
                    {step}
                  </div>
                  <div style={{ color: '#e8e0d4' }}>{text}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 18 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, color: '#8a9bb5', fontSize: 12 }}>
                <ShareIcon color="#8a9bb5" />
                <span>Safari share icon</span>
              </div>
            </div>
            <button
              onClick={() => setIosInstallOpen(false)}
              style={{ marginTop: 18, width: '100%', padding: '14px 16px', background: '#fff', border: '1px solid rgba(30,45,69,0.2)', color: '#0a0f1e', fontWeight: 700, fontSize: 16, ...pillButton }}
            >
              Got It
            </button>
          </div>
        </ModalShell>
      )}
      {androidInstallOpen && (
        <ModalShell onClose={() => setAndroidInstallOpen(false)} maxWidth={520}>
          <div style={{ textTransform: 'uppercase' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <img src="/app-icon-192.png" alt="" width="52" height="52" style={{ borderRadius: 14, background: '#0a0f1e' }} />
                <h2 style={{ color: '#c9a84c', fontSize: 22, fontWeight: 800 }}>Install Digu</h2>
              </div>
              <button
                onClick={() => setAndroidInstallOpen(false)}
                aria-label="Close install instructions"
                style={{ background: 'transparent', border: 'none', borderRadius: 999, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <CloseIcon />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, color: '#e8e0d4', fontSize: 15, lineHeight: 1.45 }}>
              {[
                ['1', <>Tap the browser <strong>menu</strong></>],
                ['2', <>Choose <strong>Install App</strong> or <strong>Add to Home Screen</strong></>],
                ['3', <>Confirm to install <strong>Digu</strong></>],
              ].map(([step, text]) => (
                <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(76,175,136,0.12)', color: '#4caf88', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>
                    {step}
                  </div>
                  <div>{text}</div>
                </div>
              ))}
            </div>
            <p style={{ color: '#8a9bb5', fontSize: 11, textAlign: 'center', marginTop: 18 }}>
              Local network links sometimes do not show the automatic install prompt.
            </p>
            <button
              onClick={() => setAndroidInstallOpen(false)}
              style={{ marginTop: 16, width: '100%', padding: '14px 16px', background: '#fff', border: '1px solid rgba(30,45,69,0.2)', color: '#0a0f1e', fontWeight: 700, fontSize: 16, ...pillButton }}
            >
              Got It
            </button>
          </div>
        </ModalShell>
      )}
      {!installDismissed && !isStandalone && (hasInstallPrompt || canShowIosInstall || isAndroid) && (
        <InstallBanner
          iosMode={canShowIosInstall}
          onInstall={openInstall}
          onDismiss={() => setInstallDismissed(true)}
        />
      )}
    </div>
  );
}
