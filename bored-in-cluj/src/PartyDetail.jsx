import React, { useState } from 'react';

export default function PartyDetail({ member, onBack, onUpdate }) {
    // State to toggle between reading and updating
    const [isEditing, setIsEditing] = useState(false);

    // State to hold the temporary form data while editing
    const [editData, setEditData] = useState({ ...member });

    // State for our mandatory data validation errors
    const [error, setError] = useState("");

    const handleSave = () => {
        // MANDATORY DATA VALIDATION
        if (editData.name.trim() === "") {
            setError("Error: Character Name cannot be empty.");
            return;
        }
        if (editData.age < 13 || editData.age > 120) {
            setError("Error: Age must be a valid number between 13 and 120.");
            return;
        }

        setError(""); // Clear errors
        onUpdate(editData); // Send updated data back to RAM in App.jsx
        setIsEditing(false); // Close edit mode
    };

    return (
        <div style={{ border: '2px solid #ff00ff', padding: '20px', marginTop: '20px', backgroundColor: '#1a1a1a' }}>
            <button onClick={onBack} style={{ marginBottom: '15px', backgroundColor: '#333', color: 'white' }}>
                &lt; Return to Roster
            </button>

            <h2 style={{ color: '#00ffcc', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
                Character Sheet
            </h2>

            {/* Display validation errors if there are any */}
            {error && <p style={{ color: '#ff3333', fontWeight: 'bold' }}>{error}</p>}

            {!isEditing ? (
                // READ MODE (Details)
                <div style={{ fontSize: '1.2rem', lineHeight: '1.8' }}>
                    <p><strong style={{ color: '#ff00ff' }}>Name:</strong> {member.name}</p>
                    <p><strong style={{ color: '#ff00ff' }}>Sex:</strong> {member.sex}</p>
                    <p><strong style={{ color: '#ff00ff' }}>Age:</strong> {member.age}</p>
                    <p><strong style={{ color: '#ff00ff' }}>Experience:</strong> {member.experience} XP</p>

                    <button
                        onClick={() => setIsEditing(true)}
                        style={{ marginTop: '15px', backgroundColor: '#00ffcc', color: 'black', fontWeight: 'bold' }}
                    >
                        Edit Stats (Update)
                    </button>
                </div>
            ) : (
                // EDIT MODE (Update)
                <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '300px', gap: '15px', marginTop: '15px' }}>
                    <label>Name:</label>
                    <input
                        type="text"
                        value={editData.name}
                        onChange={e => setEditData({...editData, name: e.target.value})}
                    />

                    <label>Sex:</label>
                    <select value={editData.sex} onChange={e => setEditData({...editData, sex: e.target.value})}>
                        <option value="M">M</option>
                        <option value="F">F</option>
                        <option value="Other">Other</option>
                    </select>

                    <label>Age:</label>
                    <input
                        type="number"
                        value={editData.age}
                        onChange={e => setEditData({...editData, age: parseInt(e.target.value)})}
                    />

                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        <button onClick={handleSave} style={{ backgroundColor: '#00ffcc', color: 'black' }}>Save</button>
                        <button onClick={() => setIsEditing(false)} style={{ backgroundColor: '#555', color: 'white' }}>Cancel</button>
                    </div>
                </div>
            )}
        </div>
    );
}