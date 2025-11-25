import React, { useEffect, useState } from 'react';
import { useTimer } from 'react-timer-hook';
import './timer.css';

//https://www.npmjs.com/package/react-timer-hook

export default function MyTimer({ expiryTimestamp }: { expiryTimestamp: Date }) {

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
    } = useTimer({ expiryTimestamp, onExpire: () => console.warn('onExpire called'), interval: 20, autoStart: false });

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
            <h3 className="timer-title">Timer</h3>
            <div className="timer-display">
                {/* Hours column */}
                <div className="time-column">
                    <button aria-label="add-hour" onClick={() => changeDuration(3600)} className="time-btn">+</button>
                    <div className="time-value">{String(hours).padStart(2, '0')}</div>
                    <button aria-label="sub-hour" onClick={() => changeDuration(-3600)} className="time-btn">-</button>
                </div>

                <div className="time-sep">:</div>

                {/* Minutes column */}
                <div className="time-column">
                    <button aria-label="add-minute" onClick={() => changeDuration(60)} className="time-btn">+</button>
                    <div className="time-value">{String(minutes).padStart(2, '0')}</div>
                    <button aria-label="sub-minute" onClick={() => changeDuration(-60)} className="time-btn">-</button>
                </div>

                <div className="time-sep">:</div>

                {/* Seconds column */}
                <div className="time-column">
                    <button aria-label="add-second" onClick={() => changeDuration(1)} className="time-btn">+</button>
                    <div className="time-value">{String(seconds).padStart(2, '0')}</div>
                    <button aria-label="sub-second" onClick={() => changeDuration(-1)} className="time-btn">-</button>
                </div>
            </div>
            <div className="timer-controls">
                {!isRunning && <button onClick={start} className="control-action">Start</button>}
                {isRunning && <button onClick={pause} className="control-action">Pause</button>}
                <button 
                    onClick={() => {applyNewDuration(0);}}
                    className="control-action control-reset">
                    Reset
                </button>
            </div>
        </div>
    );
}