import React, { useState } from 'react';

export default function QuestBoard({ quests, onDelete, onViewDetails }) {
    // --- MANDATORY PAGINATION LOGIC ---
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 3;

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = quests.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(quests.length / itemsPerPage);

    return (
        <div style={{ border: '2px solid #ff00ff', padding: '15px', marginTop: '20px', backgroundColor: '#111' }}>
            <h2 style={{ color: '#00ffcc' }}>The Guild Board (Community Quests)</h2>

            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', color: 'white' }}>
                <thead>
                <tr style={{ borderBottom: '1px solid #ff00ff' }}>
                    <th style={{ padding: '10px' }}>Quest Title</th>
                    <th style={{ padding: '10px' }}>Difficulty</th>
                    <th style={{ padding: '10px' }}>Author</th>
                    <th style={{ padding: '10px' }}>Status</th>
                    <th style={{ padding: '10px' }}>Actions</th>
                </tr>
                </thead>
                <tbody>
                {currentItems.length > 0 ? (
                    currentItems.map((quest) => (
                        <tr key={quest.id} style={{ borderBottom: '1px dashed #444' }}>
                            <td style={{ padding: '10px' }}>{quest.title}</td>
                            <td style={{ padding: '10px' }}>{'⭐'.repeat(quest.difficulty)}</td>
                            <td style={{ padding: '10px', color: quest.isYours ? '#00ffcc' : 'white' }}>
                                {quest.author}
                            </td>
                            <td style={{ padding: '10px', color: quest.status === 'Completed' ? '#ffff00' : 'white' }}>
                                {quest.status}
                            </td>
                            <td style={{ padding: '10px' }}>
                                <button onClick={() => onViewDetails(quest)} style={{ marginRight: '10px', backgroundColor: '#333', color: 'white', border: '1px solid #555', padding: '5px 10px', cursor: 'pointer' }}>
                                    View Quest
                                </button>
                                {/* Only show delete if the user owns this quest */}
                                {quest.isYours && (
                                    <button onClick={() => onDelete(quest.id)} style={{ backgroundColor: '#ff3333', color: 'white', border: 'none', padding: '5px 10px', cursor: 'pointer' }}>
                                        Erase
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))
                ) : (
                    <tr><td colSpan="5" style={{ padding: '10px', textAlign: 'center' }}>No quests found.</td></tr>
                )}
                </tbody>
            </table>

            {/* PAGINATION CONTROLS */}
            <div style={{ marginTop: '15px', display: 'flex', gap: '10px', alignItems: 'center', color: 'white' }}>
                <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} style={{ cursor: 'pointer' }}>&lt; Prev</button>
                <span>Page {currentPage} of {totalPages || 1}</span>
                <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(prev => prev + 1)} style={{ cursor: 'pointer' }}>Next &gt;</button>
            </div>
        </div>
    );
}