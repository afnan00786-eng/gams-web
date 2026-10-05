'use client';

/**
 * InstallPrompt.tsx
 *
 * Shows an "Install App" button when the app is installable as a PWA.
 * Works on Chrome/Android (beforinstallprompt event).
 * Purely additive UI component.
 */

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
    const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isInstalled, setIsInstalled] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
            return;
        }

        // Check if user dismissed previously
        if (localStorage.getItem('gams-install-dismissed') === 'true') {
            setDismissed(true);
            return;
        }

        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setInstallPrompt(e as BeforeInstallPromptEvent);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstall = async () => {
        if (!installPrompt) return;
        await installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;
        if (outcome === 'accepted') {
            setIsInstalled(true);
        }
        setInstallPrompt(null);
    };

    const handleDismiss = () => {
        setDismissed(true);
        localStorage.setItem('gams-install-dismissed', 'true');
    };

    if (isInstalled || dismissed || !installPrompt) return null;

    return (
        <div
            style={{
                position: 'fixed',
                top: '16px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 20px',
                borderRadius: '16px',
                fontSize: '14px',
                fontWeight: 500,
                color: '#fff',
                background: 'linear-gradient(135deg, #1e3a5f, #0f172a)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
                border: '1px solid rgba(249,115,22,0.4)',
                whiteSpace: 'nowrap',
            }}
        >
            <span>📲 Install GAMS App</span>
            <button
                onClick={handleInstall}
                style={{
                    background: '#f97316',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '6px 16px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '13px',
                }}
            >
                Install
            </button>
            <button
                onClick={handleDismiss}
                style={{
                    background: 'transparent',
                    color: 'rgba(255,255,255,0.5)',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '18px',
                    lineHeight: 1,
                    padding: '0 4px',
                }}
            >
                ×
            </button>
        </div>
    );
}
