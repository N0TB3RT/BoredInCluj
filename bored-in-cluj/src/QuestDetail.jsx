import React, { useState } from 'react';

export default function QuestDetail({ quest, onBack, onComplete }) {
    const [photoUploaded, setPhotoUploaded] = useState(false);

    return (
        <div style={{ border: '2px solid #00ffcc', padding: '20px', marginTop: '20px', backgroundColor: '#1a1a1a', color: 'white' }}>
            <button onClick={onBack} style={{ marginBottom: '15px', backgroundColor: '#333', color: 'white', border: 'none', padding: '8px 15px', cursor: 'pointer' }}>
                &lt; Back to Board
            </button>

            <h2 style={{ color: '#ff00ff', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
                {quest.title}
            </h2>

            <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <span style={{ backgroundColor: '#333', padding: '5px 10px', borderRadius: '5px' }}>
          Difficulty: {'⭐'.repeat(quest.difficulty)}
        </span>
                <span style={{ backgroundColor: '#333', padding: '5px 10px', borderRadius: '5px' }}>
          Category: {quest.category}
        </span>
                <span style={{ backgroundColor: '#333', padding: '5px 10px', borderRadius: '5px', color: quest.status === 'Completed' ? '#ffff00' : 'white' }}>
          Status: {quest.status}
        </span>
                <span style={{ backgroundColor: '#333', padding: '5px 10px', borderRadius: '5px', border: '1px solid #00ffcc' }}>
          AI Rating: 🤖 4.8/5
        </span>
            </div>

            <p style={{ fontSize: '1.2rem', lineHeight: '1.6', color: '#ccc' }}>
                Your party must venture forth and complete this task in the real world. Ensure you check the weather before departing!
            </p>

            {/* THE ORIGINAL FEATURE: Photo Upload */}
            {quest.status !== 'Completed' ? (
                <div style={{ marginTop: '30px', border: '2px dashed #555', padding: '30px', textAlign: 'center', borderRadius: '10px', backgroundColor: '#000' }}>
                    <h3 style={{ color: '#00ffcc', marginTop: '0' }}>Quest Completion Proof</h3>
                    <p>Upload a photo of your party completing this sidequest to earn XP!</p>

                    {!photoUploaded ? (
                        <button
                            onClick={() => setPhotoUploaded(true)}
                            style={{ backgroundColor: '#ff00ff', color: 'white', padding: '10px 20px', fontSize: '1.1rem', cursor: 'pointer', border: 'none', marginTop: '10px', borderRadius: '5px' }}
                        >
                            📸 Simulate Photo Upload
                        </button>
                    ) : (
                        <div style={{ color: '#00ffcc', marginTop: '15px' }}>
                            <p style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>✅ Photo Accepted by AI Verification!</p>
                            <button
                                onClick={() => onComplete(quest)}
                                style={{ backgroundColor: '#ffff00', color: 'black', padding: '12px 24px', fontSize: '1.1rem', cursor: 'pointer', border: 'none', marginTop: '10px', fontWeight: 'bold', borderRadius: '5px' }}
                            >
                                Claim Reward & Complete Quest
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div style={{ marginTop: '30px', padding: '20px', textAlign: 'center', backgroundColor: '#333', borderRadius: '10px', border: '2px solid #ffff00' }}>
                    <h3 style={{ color: '#ffff00', margin: '0' }}>🏆 Quest Completed!</h3>
                    <p>You have already claimed the rewards for this adventure.</p>
                </div>
            )}
        </div>
    );
}