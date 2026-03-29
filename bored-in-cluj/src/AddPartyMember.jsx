import React, { useState } from 'react';

export default function AddPartyMember({ onAdd, onCancel }) {
    // 1. Local state for our form inputs
    const [formData, setFormData] = useState({
        name: '',
        sex: 'M', // Default value
        age: ''
    });

    // 2. State to hold our validation errors
    const [error, setError] = useState('');

    // 3. The logic that runs when the user clicks "Join Party"
    const handleSubmit = (e) => {
        e.preventDefault(); // Prevents the page from refreshing

        // --- MANDATORY DATA VALIDATION ---
        if (formData.name.trim() === '') {
            setError('System Error: Character Name is required.');
            return;
        }
        if (!formData.age || formData.age < 13 || formData.age > 120) {
            setError('System Error: Age must be a number between 13 and 120.');
            return;
        }

        // Clear any previous errors
        setError('');

        // Create the new member object.
        // We generate a random ID and set starting XP to 0.
        const newMember = {
            id: Date.now(),
            name: formData.name,
            sex: formData.sex,
            age: parseInt(formData.age),
            experience: 0
        };

        // Send the new data back up to App.jsx to save in RAM
        onAdd(newMember);
    };

    return (
        <div style={{ border: '2px solid #00ffcc', padding: '20px', marginTop: '20px', backgroundColor: '#1a1a1a', maxWidth: '400px' }}>
            <h2 style={{ color: '#ff00ff', margin: '0 0 15px 0' }}>Register New Adventurer</h2>

            {/* Display validation error if it exists */}
            {error && <p style={{ color: '#ff3333', fontWeight: 'bold', border: '1px solid #ff3333', padding: '5px' }}>{error}</p>}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ color: '#00ffcc' }}>Character Name:</label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        style={{ padding: '8px', backgroundColor: '#333', color: 'white', border: '1px solid #555' }}
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ color: '#00ffcc' }}>Sex:</label>
                    <select
                        value={formData.sex}
                        onChange={(e) => setFormData({...formData, sex: e.target.value})}
                        style={{ padding: '8px', backgroundColor: '#333', color: 'white', border: '1px solid #555' }}
                    >
                        <option value="M">Male (M)</option>
                        <option value="F">Female (F)</option>
                        <option value="Other">Other</option>
                    </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ color: '#00ffcc' }}>Age:</label>
                    <input
                        type="number"
                        value={formData.age}
                        onChange={(e) => setFormData({...formData, age: e.target.value})}
                        style={{ padding: '8px', backgroundColor: '#333', color: 'white', border: '1px solid #555' }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <button type="submit" style={{ backgroundColor: '#00ffcc', color: 'black', fontWeight: 'bold', padding: '10px', flex: 1, cursor: 'pointer' }}>
                        + Join Party
                    </button>
                    <button type="button" onClick={onCancel} style={{ backgroundColor: '#555', color: 'white', padding: '10px', flex: 1, cursor: 'pointer', border: 'none' }}>
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}