import React, { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

export default function StatisticsView({ partyMembers, onBack }) {
    // Toggle state: true = Pie Chart, false = Tabular Data
    const [showVisual, setShowVisual] = useState(true);

    // --- CALCULATE STATISTICS ---
    // We count how many 'M', 'F', and 'Other' members exist in the RAM array
    const genderStats = partyMembers.reduce((acc, member) => {
        acc[member.sex] = (acc[member.sex] || 0) + 1;
        return acc;
    }, {});

    // Format data for the Recharts library
    const chartData = Object.keys(genderStats).map(key => ({
        name: key === 'M' ? 'Male' : key === 'F' ? 'Female' : 'Other',
        value: genderStats[key]
    }));

    // Colors for our retro arcade pie chart
    const COLORS = ['#00ffcc', '#ff00ff', '#ffff00'];

    return (
        <div style={{ border: '2px solid #ffff00', padding: '20px', marginTop: '20px', backgroundColor: '#1a1a1a' }}>
            <button onClick={onBack} style={{ marginBottom: '15px', backgroundColor: '#333', color: 'white', border: 'none', padding: '8px 15px', cursor: 'pointer' }}>
                &lt; Back to Main Menu
            </button>

            <h2 style={{ color: '#ffff00', marginTop: '0' }}>Party Demographics</h2>

            {/* THE MANDATORY TOGGLE SWITCH */}
            <div style={{ marginBottom: '20px' }}>
                <label style={{ color: 'white', marginRight: '10px' }}>View Mode:</label>
                <button
                    onClick={() => setShowVisual(true)}
                    style={{ backgroundColor: showVisual ? '#ffff00' : '#333', color: showVisual ? 'black' : 'white', border: '1px solid #ffff00', padding: '5px 15px', cursor: 'pointer' }}
                >
                    Visual (Pie Chart)
                </button>
                <button
                    onClick={() => setShowVisual(false)}
                    style={{ backgroundColor: !showVisual ? '#ffff00' : '#333', color: !showVisual ? 'black' : 'white', border: '1px solid #ffff00', padding: '5px 15px', cursor: 'pointer', marginLeft: '5px' }}
                >
                    Tabular Data
                </button>
            </div>

            {/* RENDER EITHER VISUAL OR TABULAR BASED ON TOGGLE */}
            {showVisual ? (
                <div style={{ display: 'flex', justifyContent: 'center', backgroundColor: '#000', padding: '20px', borderRadius: '10px' }}>
                    <PieChart width={400} height={300}>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                            label
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                </div>
            ) : (
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', color: 'white' }}>
                    <thead>
                    <tr style={{ borderBottom: '2px solid #ffff00' }}>
                        <th style={{ padding: '10px' }}>Demographic (Sex)</th>
                        <th style={{ padding: '10px' }}>Total Count</th>
                    </tr>
                    </thead>
                    <tbody>
                    {chartData.map((data, index) => (
                        <tr key={index} style={{ borderBottom: '1px solid #444' }}>
                            <td style={{ padding: '10px' }}>{data.name}</td>
                            <td style={{ padding: '10px' }}>{data.value}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}