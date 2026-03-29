import React, { useState } from 'react';
import PartyRoster from './PartyRoster';
import PartyDetail from './PartyDetail';
import AddPartyMember from './AddPartyMember';
import UserStats from './UserStats';
import QuestBoard from './QuestBoard';
import QuestDetail from './QuestDetail';
import StatisticsView from './StatisticsView';
import './App.css';


// --- 1. OUR RAM DATABASES ---
const initialParty = [
  { id: 1, name: "Alex", sex: "M", age: 22, experience: 450 },
  { id: 2, name: "Maria", sex: "F", age: 21, experience: 820 }
];

const initialQuests = [
  { id: 1, title: "Find the hidden gargoyle in Piata Unirii", category: "Exploration", difficulty: 3, author: "Admin", isYours: false, status: "Available" },
  { id: 2, title: "Eat a Kurtoskalacs in under 3 minutes", category: "Food", difficulty: 5, author: "Admin", isYours: false, status: "Available" },
  { id: 3, title: "Pet 3 stray cats in Central Park", category: "Animals", difficulty: 2, author: "You", isYours: true, status: "Available" }
];

export default function App() {
  // --- 2. STATE MANAGEMENT ---
  const [party, setParty] = useState(initialParty);
  const [quests, setQuests] = useState(initialQuests);

  // This string tells the app which screen to show right now
  const [currentScreen, setCurrentScreen] = useState('menu');

  // Track which specific item the user clicked on
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedQuest, setSelectedQuest] = useState(null);

  // --- 3. CRUD LOGIC ---
  const addMember = (newMember) => {
    setParty([...party, newMember]);
    setCurrentScreen('party');
  };
  const updateMember = (updatedMember) => {
    setParty(party.map(member => member.id === updatedMember.id ? updatedMember : member));
  };
  const deleteMember = (id) => {
    setParty(party.filter(member => member.id !== id));
  };

  const deleteQuest = (id) => {
    setQuests(quests.filter(quest => quest.id !== id));
  };
  const completeQuest = (completedQuest) => {
    // Mark the quest as completed in RAM for our UserStats pie chart
    setQuests(quests.map(q => q.id === completedQuest.id ? { ...q, status: "Completed" } : q));
    setCurrentScreen('quests'); // Go back to the board
  };

  // --- 4. ROUTING (Which screen to display) ---
  const renderScreen = () => {
    switch(currentScreen) {
        // THE PARTY SCREENS
      case 'party':
        return (
            <>
              <button onClick={() => setCurrentScreen('menu')} style={btnStyle}>&lt; Main Menu</button>
              <button onClick={() => setCurrentScreen('addMember')} style={{...btnStyle, backgroundColor: '#ff00ff', marginLeft: '10px'}}>+ Add Party Member</button>
              <PartyRoster partyMembers={party} onDelete={deleteMember} onViewDetails={(member) => { setSelectedMember(member); setCurrentScreen('memberDetail'); }} />
            </>
        );
      case 'addMember':
        return <AddPartyMember onAdd={addMember} onCancel={() => setCurrentScreen('party')} />;
      case 'memberDetail':
        return <PartyDetail member={selectedMember} onBack={() => setCurrentScreen('party')} onUpdate={updateMember} />;

        // THE QUEST SCREENS
      case 'quests':
        return (
            <>
              <button onClick={() => setCurrentScreen('menu')} style={btnStyle}>&lt; Main Menu</button>
              <QuestBoard quests={quests} onDelete={deleteQuest} onViewDetails={(quest) => { setSelectedQuest(quest); setCurrentScreen('questDetail'); }} />
            </>
        );
      case 'questDetail':
        return <QuestDetail quest={selectedQuest} onBack={() => setCurrentScreen('quests')} onComplete={completeQuest} />;
        // THE STATS SCREENS
        case 'userStats':
            return <UserStats quests={quests} onBack={() => setCurrentScreen('menu')} />;
        case 'partyStats':
            return <StatisticsView partyMembers={party} onBack={() => setCurrentScreen('menu')} />;

        // THE MAIN MENU (Default)
        default:
            return (
                <div style={{ textAlign: 'center', marginTop: '50px' }}>
                    <button onClick={() => setCurrentScreen('quests')} style={mainBtnStyle}>🗺️ Guild Board (Quests)</button>
                    <button onClick={() => setCurrentScreen('party')} style={mainBtnStyle}>🛡️ Tavern Roster (Party)</button>
                    <button onClick={() => setCurrentScreen('userStats')} style={mainBtnStyle}>📊 View Quest Stats</button>
                    <button onClick={() => setCurrentScreen('partyStats')} style={mainBtnStyle}>📈 View Party Demographics</button>
                </div>
            );
    }
  };

  return (
      <div style={{ backgroundColor: '#121212', color: '#00ffcc', minHeight: '100vh', padding: '20px', fontFamily: 'monospace' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ fontSize: '3rem', margin: '0' }}>🕹️ BoredInCluj</h1>
          <p style={{ color: '#ff00ff', letterSpacing: '2px' }}>LEVEL UP YOUR REAL LIFE</p>
        </div>

        {/* This automatically loads the correct screen based on the buttons you click */}
        {renderScreen()}

      </div>
  );
}

// Simple styles for our buttons
const btnStyle = { backgroundColor: '#333', color: 'white', border: 'none', padding: '10px 15px', cursor: 'pointer' };
const mainBtnStyle = { display: 'block', width: '300px', margin: '20px auto', padding: '15px', fontSize: '1.2rem', backgroundColor: '#00ffcc', color: 'black', fontWeight: 'bold', cursor: 'pointer', border: '2px solid #ff00ff' };