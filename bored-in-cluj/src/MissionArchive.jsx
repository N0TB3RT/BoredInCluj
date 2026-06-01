import React, { useState } from 'react';
import './MissionArchive.css';

const TYPE_COLORS = {
    Food: '#ff0055',
    Exploration: '#00d9ff',
    Athletics: '#00ffaa',
    Puzzle: '#9d00ff',
    Classified: '#ffaa00'
};

export default function MissionArchive({ quests = [], completedQuests = [], onReplayQuest = () => {} }) {
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    // --- DATA PROCESSING (The Whole Memory) ---
    const enrichedHistory = completedQuests.map(record => {
        const questDetails = quests.find(q => q.id === record.questId) || {};
        return {
            ...record,
            title: questDetails.title || 'Unknown Bounty',
            type: questDetails.type || 'Classified',
            difficulty: questDetails.difficulty || 1,
            xp: questDetails.xpReward || 0,
            originalQuest: questDetails
        };
    }).sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

    // --- PAGINATION (For the table only) ---
    const totalPages = Math.max(1, Math.ceil(enrichedHistory.length / itemsPerPage));
    const currentMissions = enrichedHistory.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // --- TOP STATS ---
    const totalXP = enrichedHistory.reduce((sum, q) => sum + q.xp, 0);
    const avgDifficulty = enrichedHistory.length > 0
        ? (enrichedHistory.reduce((sum, q) => sum + q.difficulty, 0) / enrichedHistory.length).toFixed(1) : 0;

    // --- CHART 1: LIFETIME DIFFICULTY (Uses enrichedHistory) ---
    const difficultyCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    enrichedHistory.forEach(q => {
        if (difficultyCounts[q.difficulty] !== undefined) {
            difficultyCounts[q.difficulty]++;
        }
    });
    const maxDiffCount = Math.max(...Object.values(difficultyCounts), 1);

    // --- CHART 2: LIFETIME DONUT CHART (Uses enrichedHistory) ---
    const typeCounts = enrichedHistory.reduce((acc, q) => {
        acc[q.type] = (acc[q.type] || 0) + 1;
        return acc;
    }, {});

    let cumulativePercent = 0;
    const pieSlices = Object.entries(typeCounts).map(([type, count]) => {
        const percent = (count / enrichedHistory.length) * 100;
        const start = cumulativePercent;
        cumulativePercent += percent;
        const color = TYPE_COLORS[type] || '#00d9ff';
        return `${color} ${start}% ${cumulativePercent}%`;
    });
    const conicGradient = pieSlices.length > 0 ? `conic-gradient(${pieSlices.join(', ')})` : 'none';

    // AI Star Helper
    const renderStars = (rating) => {
        const fullStars = Math.floor(rating);
        const emptyStars = 5 - fullStars;
        return (
            <span className="rating-stars" title={`${rating} Stars: AI Verified`}>
                {'★'.repeat(fullStars)}{'☆'.repeat(emptyStars)}
            </span>
        );
    };

    const renderVectorStars = (activeCount) => {
        return (
            <div style={{ display: 'flex' }}>
                {[1, 2, 3, 4, 5].map((starIndex) => (
                    <svg
                        key={starIndex}
                        width="16" height="16" viewBox="0 0 24 24"
                        fill={starIndex <= activeCount ? "currentColor" : "none"}
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        className={starIndex <= activeCount ? "star-active" : "star-dim"}
                    >
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                ))}
            </div>
        );
    };

    return (
        <div className="archive-container">
            {/* --- THE CYBER TABLE --- */}
            <div className="table-wrapper">
                <table className="cyber-table">
                    <thead>
                    <tr>
                        <th>DATE</th>
                        <th>BOUNTY TITLE</th>
                        <th>TYPE</th>
                        <th>AI RATING</th>
                        <th>ACTION</th>
                    </tr>
                    </thead>
                    <tbody>
                    {currentMissions.length === 0 ? (
                        <tr><td colSpan="5" className="empty-table-msg">NO MISSIONS COMPLETED YET.</td></tr>
                    ) : (
                        currentMissions.map((mission, index) => (
                            <tr key={index}>
                                <td data-label="DATE" className="col-id">{new Date(mission.completedAt).toLocaleDateString()}</td>
                                <td data-label="BOUNTY TITLE" className="col-title">{mission.title}</td>
                                <td data-label="TYPE" className="col-type" style={{color: TYPE_COLORS[mission.type] || '#00d9ff'}}>
                                    {mission.type.toUpperCase()}
                                </td>
                                <td data-label="AI RATING" className="col-diff">{renderStars(mission.bestRating)}</td>
                                <td data-label="ACTION">
                                    <button
                                        className="btn-table-action"
                                        onClick={() => onReplayQuest(mission.originalQuest)}
                                        disabled={!mission.originalQuest.id}
                                    >
                                        REPLAY
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                    </tbody>
                </table>

                {/* Pagination Controls */}
                {enrichedHistory.length > 0 && (
                    <div className="pagination-controls">
                        <button className="btn-page" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)}>[ &lt; PREV ]</button>
                        <span className="page-indicator">PAGE <span className="highlight">{currentPage}</span> OF {totalPages}</span>
                        <button className="btn-page" disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)}>[ NEXT &gt; ]</button>
                    </div>
                )}
            </div>

            {/* --- REACTIVE 3D TELEMETRY CHARTS --- */}
            <div className="telemetry-charts-section">

                {/* 1. 3D SEGMENTED LED DIFFICULTY CHART */}
                <div className="chart-box chart-3d-container">
                    <h3 className="chart-title">LIFETIME DIFFICULTY</h3>
                    <div className="bar-chart">
                        {[5, 4, 3, 2, 1].map((stars, idx) => (
                            <div key={stars} className="bar-row" style={{ animationDelay: `${idx * 0.1}s` }}>
                                <div className="bar-label">
                                    {renderVectorStars(stars)}
                                </div>
                                <div className="bar-track">
                                    <div
                                        className="bar-fill-premium"
                                        style={{ '--target-width': `${(difficultyCounts[stars] / maxDiffCount) * 100}%` }}
                                    ></div>
                                </div>
                                <span className="bar-value">{difficultyCounts[stars]}</span>
                            </div>
                        ))}
                    </div>
                </div>
                {/* 2. 3D HOLOGRAPHIC DONUT CHART */}
                <div className="chart-box chart-3d-container">
                    <h3 className="chart-title">OVERALL DISTRIBUTION</h3>
                    <div className="pie-chart-wrapper">
                        <div className="hologram-stage">
                            <div className="pie-chart-3d" style={{ background: conicGradient }}></div>
                            <div className="pie-shadow"></div>
                        </div>
                        <div className="pie-legend">
                            {Object.entries(typeCounts).map(([type, count], idx) => (
                                <div key={type} className="legend-item" style={{ animationDelay: `${idx * 0.15}s` }}>
                                    <div className="color-box" style={{ backgroundColor: TYPE_COLORS[type] || '#00d9ff' }}></div>
                                    <span className="legend-label">{type.toUpperCase()} ({count})</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}