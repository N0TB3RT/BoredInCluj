import React, { useState } from 'react';

// This component ONLY handles the visuals (HTML/CSS) for the table.
// It receives the data and functions from App.jsx via "props".
export default function PartyRoster({ partyMembers, onDelete }) {
    // --- PAGINATION LOGIC ---
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 2; // Kept small so you can easily test pagination!

    // Calculate which items to show on the current page
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = partyMembers.slice(indexOfFirstItem, indexOfLastItem);

    const totalPages = Math.ceil(partyMembers.length / itemsPerPage);

    return (
        <div style={{ border: '2px solid #00ffcc', padding: '15px', marginTop: '20px' }}>
            <h2 style={{ color: '#ff00ff' }}>Tavern Roster (Master View)</h2>

            {/* THE TABLE */}
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                <tr style={{ borderBottom: '1px solid #00ffcc' }}>
                    <th>Name</th>
                    <th>Class/Role</th>
                    <th>Actions</th>
                </tr>
                </thead>
                <tbody>
                {currentItems.length > 0 ? (
                    currentItems.map((member) => (
                        <tr key={member.id} style={{ borderBottom: '1px dashed #555' }}>
                            <td style={{ padding: '8px 0' }}>{member.name}</td>
                            <td>Level {Math.floor(member.experience / 100)}</td>
                            <td>
                                <button
                                    onClick={() => onViewDetails(member)}
                                    style={{ marginRight: '10px', backgroundColor: '#333', color: 'white' }}
                                >
                                    View Details
                                </button>
                                <button
                                    onClick={() => onDelete(member.id)}
                                    style={{ backgroundColor: '#ff3333', color: 'white', border: 'none' }}
                                >
                                    Kick (Erase)
                                </button>
                            </td>
                        </tr>
                    ))
                ) : (
                    <tr><td colSpan="3">No party members found.</td></tr>
                )}
                </tbody>
            </table>

            {/* PAGINATION CONTROLS */}
            <div style={{ marginTop: '15px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => prev - 1)}
                >
                    &lt; Prev
                </button>
                <span>Page {currentPage} of {totalPages || 1}</span>
                <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(prev => prev + 1)}
                >
                    Next &gt;
                </button>
            </div>
        </div>
    );
}