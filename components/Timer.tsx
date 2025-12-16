import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useTimer } from 'react-timer-hook';
import './timer.css';

//https://www.npmjs.com/package/react-timer-hook

export default function MyTimer({ expiryTimestamp, beepCount = 8 }: { expiryTimestamp: Date, beepCount?: number }) {

    const audioCtxRef = useRef<AudioContext | null>(null);

    const ensureAudioContext = useCallback(() => {
        if (!audioCtxRef.current) {
            const C = (window as any).AudioContext || (window as any).webkitAudioContext;
            try {
                audioCtxRef.current = new C();
            } catch (e) {
                audioCtxRef.current = null;
            }
        }
        return audioCtxRef.current;
    }, []);

    const resumeAudio = useCallback(async () => {
        const ctx = ensureAudioContext();
        if (!ctx) return;
        if (ctx.state === 'suspended') {
            try {
                await ctx.resume();
            } catch (e) {
                // ignore
            }
        }
    }, [ensureAudioContext]);

    const playBeep = useCallback((freq = 880, durationMs = 300) => {
        const ctx = ensureAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(0.1, now + 0.01);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
        o.stop(now + durationMs / 1000 + 0.05);
    }, [ensureAudioContext]);

    const handleExpire = useCallback(async () => {
        await resumeAudio();
        const count = Math.max(1, Math.round(beepCount || 1));
        const intervalMs = 350;
        const durationMs = 500;
        for (let i = 0; i < count; i++) {
            // schedule each beep with the chosen interval
            setTimeout(() => playBeep(880, durationMs), i * intervalMs);
        }
    }, [playBeep, resumeAudio, beepCount]);

    const [durationSeconds, setDurationSeconds] = useState<number>(() => {
        const now = new Date();
        return Math.max(0, Math.round((expiryTimestamp.getTime() - now.getTime()) / 1000));
    });

    const {
        seconds,
        minutes,
        hours,
        isRunning,
        start,
        pause,
        restart,
    } = useTimer({ expiryTimestamp, onExpire: handleExpire, interval: 20, autoStart: false });

    const startHandler = useCallback(async () => {
        await resumeAudio();
        try {
            start();
        } catch (e) {
            // ignore
        }
    }, [resumeAudio, start]);

    // initialize duration when prop changes
    useEffect(() => {
        const now = new Date();
        const secs = Math.max(0, Math.round((expiryTimestamp.getTime() - now.getTime()) / 1000));
        setDurationSeconds(secs);
    }, [expiryTimestamp]);

    useEffect(() => {
        const remaining = hours * 3600 + minutes * 60 + seconds;
        setDurationSeconds(remaining);
    }, [hours, minutes, seconds]);

    const applyNewDuration = (newSeconds: number) => {
        const clamped = Math.max(0, Math.round(newSeconds));
        const now = new Date();
        const time = new Date(now.getTime() + clamped * 1000);
        try {
            restart(time, isRunning);
        } catch (e) {
            restart(time);
            if (!isRunning) pause();
        }
        setDurationSeconds(clamped);
    };

    const changeDuration = (delta: number) => {
        applyNewDuration(durationSeconds + delta);
    };

    return (
        <div className="timer-inner">
            <h3 className="timer-title h3">Timer</h3>
            <div className="timer-display">
                {/* Hours column */}
                <div className="time-column">
                    <button className="button time-btn" aria-label="add-hour" onClick={() => changeDuration(3600)}>+</button>
                    <div className="time-value">{String(hours).padStart(2, '0')}</div>
                    <button className="button time-btn" aria-label="sub-hour" onClick={() => changeDuration(-3600)}>-</button>
                </div>

                <div className="time-sep">:</div>

                {/* Minutes column */}
                <div className="time-column">
                    <button className="button time-btn" aria-label="add-minute" onClick={() => changeDuration(60)}>+</button>
                    <div className="time-value">{String(minutes).padStart(2, '0')}</div>
                    <button className="button time-btn" aria-label="sub-minute" onClick={() => changeDuration(-60)}>-</button>
                </div>

                <div className="time-sep">:</div>

                {/* Seconds column */}
                <div className="time-column">
                    <button className="button time-btn" aria-label="add-second" onClick={() => changeDuration(1)}>+</button>
                    <div className="time-value">{String(seconds).padStart(2, '0')}</div>
                    <button className="button time-btn" aria-label="sub-second" onClick={() => changeDuration(-1)}>-</button>
                </div>
            </div>
            <div className="timer-controls">
                {!isRunning && <button onClick={startHandler} className="button control-action">Start</button>}
                {isRunning && <button onClick={pause} className="button control-action">Pause</button>}
                <button 
                    onClick={() => {applyNewDuration(0);}}
                    className="button control-action control-reset">
                    Reset
                </button>
            </div>
        </div>
    );
}