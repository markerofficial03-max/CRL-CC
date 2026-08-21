/**
 * SLA Timer Engine
 * Computes 1-Hour (60 Minutes) SLA target countdown, calculates urgency levels,
 * and updates live UI elements on the right sidebar and data tables.
 */

const SLA_CONFIG = {
    DURATION_MINUTES: 60, // 1 hour SLA limit
    DURATION_MS: 60 * 60 * 1000,
    TICK_INTERVAL_MS: 1000 // Tick every 1 second
};

const SLATimer = {
    intervalId: null,

    // Calculate time metrics for a given creation timestamp
    getMetrics(createdAtIso) {
        const createdTime = new Date(createdAtIso).getTime();
        const now = Date.now();
        const elapsedMs = now - createdTime;
        const remainingMs = SLA_CONFIG.DURATION_MS - elapsedMs;
        const totalDurationMs = SLA_CONFIG.DURATION_MS;

        const isOverdue = remainingMs < 0;
        const percentElapsed = Math.min(100, Math.max(0, (elapsedMs / totalDurationMs) * 100));
        const percentRemaining = Math.max(0, 100 - percentElapsed);

        // Calculate minutes and seconds
        const absDiffSec = Math.floor(Math.abs(remainingMs) / 1000);
        const mins = Math.floor(absDiffSec / 60);
        const secs = absDiffSec % 60;

        const formattedTime = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

        // Status classification:
        // - 'safe': > 30 minutes left (Green)
        // - 'warning': 10 - 30 minutes left (Yellow/Amber)
        // - 'critical': 0 - 10 minutes left (Orange/Red pulse)
        // - 'overdue': < 0 minutes (Breached SLA / Flash Red)
        let status = 'safe';
        let statusLabel = 'On Track';
        let badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
        let barColor = 'bg-emerald-500';
        let glowClass = '';

        if (isOverdue) {
            status = 'overdue';
            statusLabel = `OVERDUE (-${mins}m ${secs}s)`;
            badgeClass = 'bg-rose-600 text-white border-rose-700 animate-pulse font-bold';
            barColor = 'bg-rose-600';
            glowClass = 'ring-2 ring-rose-500 shadow-lg shadow-rose-200';
        } else if (mins < 10) {
            status = 'critical';
            statusLabel = `CRITICAL (${formattedTime})`;
            badgeClass = 'bg-red-500 text-white border-red-600 animate-pulse';
            barColor = 'bg-red-500';
            glowClass = 'ring-2 ring-red-400';
        } else if (mins < 30) {
            status = 'warning';
            statusLabel = `WARNING (${formattedTime})`;
            badgeClass = 'bg-amber-100 text-amber-900 border-amber-400 font-semibold';
            barColor = 'bg-amber-500';
            glowClass = 'ring-1 ring-amber-300';
        } else {
            status = 'safe';
            statusLabel = `${formattedTime} left`;
            badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
            barColor = 'bg-emerald-500';
            glowClass = '';
        }

        return {
            isOverdue,
            remainingMs,
            elapsedMs,
            mins,
            secs,
            formattedTime,
            status,
            statusLabel,
            badgeClass,
            barColor,
            glowClass,
            percentRemaining,
            percentElapsed
        };
    },

    // Start background tick loop
    start(renderCallback) {
        if (this.intervalId) clearInterval(this.intervalId);
        this.intervalId = setInterval(() => {
            if (typeof renderCallback === 'function') {
                renderCallback();
            }
        }, SLA_CONFIG.TICK_INTERVAL_MS);
    },

    // Stop loop
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
};
