import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery } from '@apollo/client/react';
import { gql } from '@apollo/client/core';
import './AdminPanel.css';

const TYPE_COLORS = {
    Food: '#ff0055', Exploration: '#00d9ff', Athletics: '#00ffaa',
    Puzzle: '#9d00ff', Classified: '#ffaa00', Alien: '#fff'
};

// --- THE GRAPHQL MUTATIONS WITH IMAGE URL PATHS INTEGRATED ---
const CREATE_QUEST = gql`
  mutation CreateQuest($title: String!, $type: String!, $description: String!, $difficulty: Int!, $xpReward: Int!, $cost: String!, $status: String!, $lat: Float!, $lng: Float!, $locName: String!, $daytime: String!, $weather: String!, $season: String!, $imageUrl: String) {
    createQuest(title: $title, type: $type, description: $description, difficulty: $difficulty, xpReward: $xpReward, cost: $cost, status: $status, lat: $lat, lng: $lng, locName: $locName, daytime: $daytime, weather: $weather, season: $season, imageUrl: $imageUrl) {
      id
      title 
      type 
      description 
      difficulty 
      cost 
      xpReward 
      status 
      backgroundImage 
      location { name lat lng } 
      conditions { daytime weather season }
    }
  }
`;

const UPDATE_QUEST = gql`
  mutation UpdateQuest($questId: String!, $title: String!, $type: String!, $description: String!, $difficulty: Int!, $xpReward: Int!, $cost: String!, $status: String!, $lat: Float!, $lng: Float!, $locName: String!, $daytime: String!, $weather: String!, $season: String!, $imageUrl: String) {
    updateQuest(questId: $questId, title: $title, type: $type, description: $description, difficulty: $difficulty, xpReward: $xpReward, cost: $cost, status: $status, lat: $lat, lng: $lng, locName: $locName, daytime: $daytime, weather: $weather, season: $season, imageUrl: $imageUrl) {
      id
    }
  }
`;

const DELETE_QUEST = gql`
  mutation DeleteQuest($questId: String!) {
    deleteQuest(questId: $questId)
  }
`;

const CREATE_EVENT = gql`
  mutation CreateEvent($title: String!, $description: String!, $dateTime: String!, $location: String!, $hostUsername: String!, $imageUrl: String) {
    createEvent(title: $title, description: $description, dateTime: $dateTime, location: $location, hostUsername: $hostUsername, imageUrl: $imageUrl) {
      id
      title
      description
      dateTime
      location
      imageUrl
    }
  }
`;

const UPDATE_EVENT = gql`
  mutation UpdateEvent($eventId: String!, $title: String!, $description: String!, $dateTime: String!, $location: String!, $imageUrl: String) {
    updateEvent(eventId: $eventId, title: $title, description: $description, dateTime: $dateTime, location: $location, imageUrl: $imageUrl) {
      id
      title
    }
  }
`;

const DELETE_EVENT = gql`
  mutation DeleteEvent($eventId: String!) {
    deleteEvent(eventId: $eventId)
  }
`;

const GET_THREATS = gql`
  query GetThreats {
    getObservationLogs {
      id
      userId
      reason
      timestamp
      isReviewed
    }
  }
`;

export default function AdminPanel({ quests, setQuests, suggestedQuests, onAccept, onReject, events, setEvents }) {
    // --- DYNAMIC ENVIRONMENT URLS ---
    const API_URL = import.meta.env.VITE_API_URL || 'https://10.200.251.90:8000';
    const WS_URL = API_URL.replace(/^http/, 'ws');

    const [activeTab, setActiveTab] = useState('db');

    const { data: threatData, loading: threatsLoading, refetch: refetchThreats } = useQuery(GET_THREATS, {
        skip: activeTab !== 'security', // Only fetch when the tab is open
        fetchPolicy: 'network-only'
    });
    const threats = threatData?.getObservationLogs || [];

    // --- APOLLO HOOKS ---
    const [createQuest] = useMutation(CREATE_QUEST);
    const [updateQuest] = useMutation(UPDATE_QUEST);
    const [deleteQuest] = useMutation(DELETE_QUEST);

    const [createEvent] = useMutation(CREATE_EVENT);
    const [updateEvent] = useMutation(UPDATE_EVENT);
    const [deleteEvent] = useMutation(DELETE_EVENT);

    // --- SEARCH STATE ---
    const [questSearch, setQuestSearch] = useState('');
    const [eventSearch, setEventSearch] = useState('');

    // --- SORTING STATE ---
    const [questSort, setQuestSort] = useState({ key: 'id', direction: 'descending' });
    const [eventSort, setEventSort] = useState({ key: 'id', direction: 'descending' });

    // --- PAGINATION STATE ---
    const [questPage, setQuestPage] = useState(1);
    const [eventPage, setEventPage] = useState(1);
    const itemsPerPage = 5;

    // --- SIMULATION STATE & WEBSOCKET ---
    const [isSimulating, setIsSimulating] = useState(false);

    useEffect(() => {
        const ws = new WebSocket(`${WS_URL}/api/simulation/ws`);
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'NEW_QUEST') {
                setQuests(prevQuests => [data.payload, ...prevQuests]);
            }
        };
        return () => ws.close();
    }, [setQuests, WS_URL]);

    const toggleSimulation = async () => {
        try {
            if (isSimulating) {
                await fetch(`${API_URL}/api/simulation/stop`, { method: 'POST' });
                setIsSimulating(false);
            } else {
                await fetch(`${API_URL}/api/simulation/start`, { method: 'POST' });
                setIsSimulating(true);
            }
        } catch (error) {
            console.error("Simulation control failed.", error);
        }
    };

    // --- QUEST CRUD STATE ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [questErrors, setQuestErrors] = useState({});
    const fileInputRef = useRef(null);
    const [questFileBlob, setQuestFileBlob] = useState(null);

    const defaultForm = {
        title: '', type: 'Exploration', author: 'Admin', description: '',
        difficulty: 3, cost: 'None', xpReward: 250, status: 'Active',
        backgroundImage: null,
        location: { name: '', lat: 46.7712, lng: 23.5905 },
        conditions: { daytime: 'ANY', weather: 'ANY', season: 'ANY' }
    };
    const [formData, setFormData] = useState(defaultForm);

    // --- EVENT CRUD STATE ---
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [editingEventId, setEditingEventId] = useState(null);
    const [eventErrors, setEventErrors] = useState({});
    const eventFileInputRef = useRef(null);
    const [eventFileBlob, setEventFileBlob] = useState(null);

    const defaultEventForm = {
        title: '', description: '', location: { name: '', lat: 46.7712, lng: 23.5905 }, dateTime: '', imageUrl: null
    };
    const [eventFormData, setEventFormData] = useState(defaultEventForm);

    // --- PIPELINE STEP 1: SEARCH FILTERS ---
    const filteredQuests = quests.filter(q =>
        q.title.toLowerCase().includes(questSearch.toLowerCase()) ||
        q.id.toLowerCase().includes(questSearch.toLowerCase()) ||
        q.type.toLowerCase().includes(questSearch.toLowerCase())
    );

    const filteredEvents = events.filter(e =>
        (e.title || e.name || '').toLowerCase().includes(eventSearch.toLowerCase()) ||
        e.id.toLowerCase().includes(eventSearch.toLowerCase()) ||
        (e.location && typeof e.location === 'string' && e.location.toLowerCase().includes(eventSearch.toLowerCase())) ||
        (e.location?.name && e.location.name.toLowerCase().includes(eventSearch.toLowerCase()))
    );

    // --- PIPELINE STEP 2: SORTING LOGIC ---
    const handleQuestSort = (key) => {
        let direction = 'ascending';
        if (questSort.key === key && questSort.direction === 'ascending') direction = 'descending';
        setQuestSort({ key, direction });
    };

    const handleEventSort = (key) => {
        let direction = 'ascending';
        if (eventSort.key === key && eventSort.direction === 'ascending') direction = 'descending';
        setEventSort({ key, direction });
    };

    const sortedQuests = [...filteredQuests].sort((a, b) => {
        let valA = questSort.key === 'location' ? (a.location?.name || '') : a[questSort.key];
        let valB = questSort.key === 'location' ? (b.location?.name || '') : b[questSort.key];

        if (questSort.key === 'id') {
            const cmp = String(valA).localeCompare(String(valB), undefined, { numeric: true });
            return questSort.direction === 'ascending' ? cmp : -cmp;
        }

        if (valA < valB) return questSort.direction === 'ascending' ? -1 : 1;
        if (valA > valB) return questSort.direction === 'ascending' ? 1 : -1;
        return 0;
    });

    const sortedEvents = [...filteredEvents].sort((a, b) => {
        let valA = eventSort.key === 'location' ? (typeof a.location === 'string' ? a.location : (a.location?.name || '')) : a[eventSort.key];
        let valB = eventSort.key === 'location' ? (typeof b.location === 'string' ? b.location : (b.location?.name || '')) : b[eventSort.key];
        let key = eventSort.key === 'name' ? 'title' : eventSort.key;

        if (eventSort.key === 'name' || eventSort.key === 'title') {
            valA = a.title || a.name || '';
            valB = b.title || b.name || '';
        }

        if (eventSort.key === 'id') {
            const cmp = String(a.id).localeCompare(String(b.id), undefined, { numeric: true });
            return eventSort.direction === 'ascending' ? cmp : -cmp;
        }

        if (eventSort.key === 'date' || eventSort.key === 'dateTime') {
            valA = new Date(a.dateTime || a.date).getTime();
            valB = new Date(b.dateTime || b.date).getTime();
        }

        if (valA < valB) return eventSort.direction === 'ascending' ? -1 : 1;
        if (valA > valB) return eventSort.direction === 'ascending' ? 1 : -1;
        return 0;
    });

    const totalQuestPages = Math.max(1, Math.ceil(sortedQuests.length / itemsPerPage));
    const currentQuests = sortedQuests.slice((questPage - 1) * itemsPerPage, questPage * itemsPerPage);

    const totalEventPages = Math.max(1, Math.ceil(sortedEvents.length / itemsPerPage));
    const currentEvents = sortedEvents.slice((eventPage - 1) * itemsPerPage, eventPage * itemsPerPage);

    useEffect(() => { if (questPage > totalQuestPages) setQuestPage(totalQuestPages); }, [sortedQuests.length, questPage, totalQuestPages]);
    useEffect(() => { if (eventPage > totalEventPages) setEventPage(totalEventPages); }, [sortedEvents.length, eventPage, totalEventPages]);

    // --- VALIDATION ENGINES ---
    const validateQuest = () => {
        const errors = {};
        if (!formData.title.trim() || formData.title.length < 5) errors.title = "Title must be at least 5 characters.";
        if (!formData.description.trim() || formData.description.length < 15) errors.description = "Description must be at least 15 characters.";
        if (!formData.location.name.trim()) errors.location = "Location name is required.";
        if (formData.difficulty < 1 || formData.difficulty > 5) errors.difficulty = "Difficulty must be between 1 and 5.";
        if (formData.xpReward <= 0 || formData.xpReward > 1000) errors.xpReward = "XP must be between 1 and 1000.";

        setQuestErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const validateEvent = () => {
        const errors = {};
        if (!eventFormData.title.trim() || eventFormData.title.length < 5) errors.title = "Event title must be at least 5 characters.";
        if (!eventFormData.description.trim() || eventFormData.description.length < 15) errors.description = "Description must be at least 15 characters.";

        const locName = typeof eventFormData.location === 'string' ? eventFormData.location : eventFormData.location?.name;
        if (!locName || !locName.trim()) errors.location = "Venue name is required.";

        const targetDate = eventFormData.dateTime || eventFormData.date;
        if (!targetDate) {
            errors.date = "Date and time are required.";
        } else if (new Date(targetDate) < new Date()) {
            errors.date = "Event date cannot be in the past.";
        }

        setEventErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // --- QUEST FILE MANAGEMENT WITH API STREAMING ---
    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            setQuestFileBlob(file);
            setFormData({ ...formData, backgroundImage: URL.createObjectURL(file) });
        }
    };

    const handleAddNew = () => { setEditingId(null); setQuestFileBlob(null); setFormData(defaultForm); setQuestErrors({}); setIsModalOpen(true); };

    const handleEdit = (quest) => {
        setEditingId(quest.id);
        setQuestFileBlob(null);
        setQuestErrors({});
        setFormData({
            title: quest.title, type: quest.type, author: quest.author, description: quest.description,
            difficulty: quest.difficulty || 1, cost: quest.cost || 'None', xpReward: quest.xpReward || 250, status: quest.status || 'Active',
            backgroundImage: quest.backgroundImage || null,
            location: quest.location || { name: '', lat: 46.7712, lng: 23.5905 },
            conditions: quest.conditions ? {
                daytime: quest.conditions.daytime?.join(', ') || 'ANY',
                weather: quest.conditions.weather?.join(', ') || 'ANY',
                season: quest.conditions.season?.join(', ') || 'ANY'
            } : { daytime: 'ANY', weather: 'ANY', season: 'ANY' }
        });
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!validateQuest()) return;

        let serverStoredUrl = formData.backgroundImage;

        // Fire binary stream to REST endpoint if a new local file instance exists
        if (questFileBlob) {
            const mediaPayload = new FormData();
            mediaPayload.append("file", questFileBlob);
            try {
                const res = await fetch(`${API_URL}/api/upload-media/quests`, {
                    method: "POST",
                    body: mediaPayload
                });
                const parsedRes = await res.json();
                serverStoredUrl = parsedRes.imageUrl;
            } catch (err) {
                console.error("Quest REST Image upload failed.", err);
                alert("Image storage failed. Aborting mutation synchronization.");
                return;
            }
        }

        const conditionVars = {
            daytime: formData.conditions.daytime,
            weather: formData.conditions.weather,
            season: formData.conditions.season
        };

        try {
            if (editingId) {
                await updateQuest({ variables: {
                        questId: editingId,
                        title: formData.title,
                        type: formData.type,
                        description: formData.description,
                        difficulty: formData.difficulty,
                        xpReward: formData.xpReward,
                        cost: formData.cost,
                        status: formData.status,
                        lat: formData.location.lat,
                        lng: formData.location.lng,
                        locName: formData.location.name,
                        imageUrl: serverStoredUrl,
                        ...conditionVars
                    }});

                const parsedConditions = { daytime: conditionVars.daytime.split(','), weather: conditionVars.weather.split(','), season: conditionVars.season.split(',') };
                setQuests(quests.map(q => q.id === editingId ? { ...q, ...formData, backgroundImage: serverStoredUrl, conditions: parsedConditions } : q));
                setIsModalOpen(false);
            } else {
                const { data } = await createQuest({ variables: {
                        title: formData.title,
                        type: formData.type,
                        description: formData.description,
                        difficulty: formData.difficulty,
                        xpReward: formData.xpReward,
                        cost: formData.cost,
                        status: formData.status,
                        lat: formData.location.lat,
                        lng: formData.location.lng,
                        locName: formData.location.name,
                        imageUrl: serverStoredUrl,
                        ...conditionVars
                    }});
                if (data && data.createQuest) {
                    setQuests([data.createQuest, ...quests]);
                    setIsModalOpen(false);
                }
            }
        } catch (error) {
            console.error("GraphQL Quest Action Failed", error);
            alert("Database action failed.");
        }
    };

    const handleDeleteQuest = async (questId) => {
        if(window.confirm("WARNING: Permanent delete execution. Proceed?")) {
            try {
                await deleteQuest({ variables: { questId } });
                setQuests(quests.filter(q => q.id !== questId));
            } catch (error) {
                console.error("GraphQL Delete Failed", error);
            }
        }
    };

    // --- EVENT FILE MANAGEMENT WITH API STREAMING ---
    const handleEventImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            setEventFileBlob(file);
            setEventFormData({ ...eventFormData, imageUrl: URL.createObjectURL(file) });
        }
    };

    const handleAddNewEvent = () => { setEditingEventId(null); setEventFileBlob(null); setEventFormData(defaultEventForm); setEventErrors({}); setIsEventModalOpen(true); };

    const handleEditEvent = (event) => {
        setEditingEventId(event.id);
        setEventFileBlob(null);
        setEventErrors({});
        const eventDateStr = event.dateTime || event.date || '';
        const formattedDate = eventDateStr ? eventDateStr.substring(0, 16) : '';
        setEventFormData({
            title: event.title || event.name || '',
            description: event.description || '',
            location: event.location || { name: '', lat: 46.7712, lng: 23.5905 },
            dateTime: formattedDate,
            imageUrl: event.imageUrl || event.photo || null
        });
        setIsEventModalOpen(true);
    };

    const handleSaveEvent = async () => {
        if (!validateEvent()) return;
        let serverStoredEventUrl = eventFormData.imageUrl;

        // 1. Stream file data to the REST API if a new local selection is present
        if (eventFileBlob) {
            const mediaPayload = new FormData();
            mediaPayload.append("file", eventFileBlob);
            try {
                const res = await fetch(`${API_URL}/api/upload-media/events`, {
                    method: "POST",
                    body: mediaPayload
                });
                const parsedRes = await res.json();
                serverStoredEventUrl = parsedRes.imageUrl;
            } catch (err) {
                console.error("Event REST Image upload failed.", err);
                alert("Event image storage failed. Aborting database save.");
                return;
            }
        }

        const targetFinalDate = eventFormData.dateTime || eventFormData.date;
        const isolatedIsoDate = new Date(targetFinalDate).toISOString();
        const venueName = typeof eventFormData.location === 'string' ? eventFormData.location : (eventFormData.location?.name || '');

        try {
            if (editingEventId) {
                // If editing an existing event node
                await updateEvent({
                    variables: {
                        eventId: editingEventId,
                        title: eventFormData.title,
                        description: eventFormData.description,
                        dateTime: isolatedIsoDate,
                        location: venueName,
                        imageUrl: serverStoredEventUrl
                    }
                });

                setEvents(events.map(e => e.id === editingEventId ? {
                    ...e,
                    title: eventFormData.title,
                    description: eventFormData.description,
                    dateTime: isolatedIsoDate,
                    location: venueName,
                    imageUrl: serverStoredEventUrl
                } : e));
            } else {
                // Creating a brand new event
                const { data } = await createEvent({
                    variables: {
                        title: eventFormData.title,
                        description: eventFormData.description,
                        dateTime: isolatedIsoDate,
                        location: venueName,
                        hostUsername: "admin@boredincluj.com", // Fallback system operator account
                        imageUrl: serverStoredEventUrl
                    }
                });

                if (data && data.createEvent) {
                    setEvents([data.createEvent, ...events]);
                }
            }
            setIsEventModalOpen(false);
            setEventFileBlob(null);
        } catch (err) {
            console.error("GraphQL Event Persistence Mutation Failed", err);
            alert("Failed to sync event to PostgreSQL.");
        }
    };

    const handleDeleteEvent = async (eventId) => {
        if (window.confirm("Are you sure you want to delete this event from the permanent database?")) {
            try {
                await deleteEvent({ variables: { eventId } });
                setEvents(events.filter(e => e.id !== eventId));
            } catch (err) {
                console.error("Delete event failed", err);
            }
        }
    };

    // --- ANALYTICS CALCULATIONS ---
    const difficultyCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    quests.forEach(q => {
        if (difficultyCounts[q.difficulty] !== undefined) {
            difficultyCounts[q.difficulty]++;
        }
    });
    const maxDiffCount = Math.max(...Object.values(difficultyCounts), 1);

    const typeCounts = quests.reduce((acc, q) => {
        acc[q.type] = (acc[q.type] || 0) + 1;
        return acc;
    }, {});

    let cumulativePercent = 0;
    const pieSlices = Object.entries(typeCounts).map(([type, count]) => {
        const percent = (count / (quests.length || 1)) * 100;
        const start = cumulativePercent;
        cumulativePercent += percent;
        const color = TYPE_COLORS[type] || '#fff';
        return `${color} ${start}% ${cumulativePercent}%`;
    });
    const conicGradient = pieSlices.length > 0 ? `conic-gradient(${pieSlices.join(', ')})` : 'none';

    const renderVectorStars = (activeCount) => {
        return (
            <div style={{ display: 'flex', gap: '2px' }}>
                {[1, 2, 3, 4, 5].map((starIndex) => (
                    <svg key={starIndex} width="14" height="14" viewBox="0 0 24 24" fill={starIndex <= activeCount ? "#00d9ff" : "none"} stroke={starIndex <= activeCount ? "#00d9ff" : "#444"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                ))}
            </div>
        );
    };

    const renderSortHeader = (label, key, currentSort, sortHandler) => (
        <th onClick={() => sortHandler(key)} className="sortable-header">
            {label}
            <span className="sort-arrow">
                {currentSort.key === key ? (currentSort.direction === 'ascending' ? ' ▲' : ' ▼') : ' ↕'}
            </span>
        </th>
    );

    return (
        <div className="admin-container">
            <div className="admin-header">
                <div>
                    <h1 className="admin-title">ADMIN DASHBOARD</h1>
                    <div className="admin-tabs">
                        <button className={`tab-btn ${activeTab === 'db' ? 'active' : ''}`} onClick={() => setActiveTab('db')}>QUESTS</button>
                        <button className={`tab-btn ${activeTab === 'events' ? 'active' : ''}`} onClick={() => setActiveTab('events')}>EVENTS</button>
                        <button className={`tab-btn ${activeTab === 'suggestions' ? 'active' : ''}`} onClick={() => setActiveTab('suggestions')}>
                            SUGGESTIONS {suggestedQuests.length > 0 && <span className="badge-count">{suggestedQuests.length}</span>}
                        </button>
                        <button className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`} onClick={() => setActiveTab('security')}>
                            SECURITY 🛡️ {threats.length > 0 && <span className="badge-count" style={{background: '#ff0055'}}>{threats.length}</span>}
                        </button>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '15px' }}>
                    {activeTab === 'db' && (
                        <button
                            onClick={toggleSimulation}
                            className="btn-add-quest"
                            style={{
                                background: isSimulating ? 'transparent' : '#9d00ff',
                                color: isSimulating ? '#ff0055' : '#fff',
                                border: isSimulating ? '2px solid #ff0055' : 'none',
                                boxShadow: isSimulating ? '0 0 10px #ff0055' : '0 0 10px #9d00ff'
                            }}
                        >
                            {isSimulating ? '🛑 STOP SIMULATION' : '⚡ START SIMULATION'}
                        </button>
                    )}
                    {activeTab === 'db' && <button className="btn-add-quest" onClick={handleAddNew}>+ NEW QUEST</button>}
                    {activeTab === 'events' && <button className="btn-add-quest" onClick={handleAddNewEvent}>+ NEW EVENT</button>}
                </div>
            </div>

            {activeTab === 'db' && (
                <div className="admin-table-wrapper">
                    <div className="admin-toolbar">
                        <input
                            type="text"
                            className="admin-search-input"
                            placeholder="Search Database by ID, Title, or Type..."
                            value={questSearch}
                            onChange={(e) => { setQuestSearch(e.target.value); setQuestPage(1); }}
                        />
                    </div>

                    <table className="admin-table">
                        <thead>
                        <tr>
                            {renderSortHeader('ID', 'id', questSort, handleQuestSort)}
                            {renderSortHeader('TITLE', 'title', questSort, handleQuestSort)}
                            {renderSortHeader('TYPE', 'type', questSort, handleQuestSort)}
                            {renderSortHeader('LOC', 'location', questSort, handleQuestSort)}
                            {renderSortHeader('STATUS', 'status', questSort, handleQuestSort)}
                            <th>ACTIONS</th>
                        </tr>
                        </thead>
                        <tbody>
                        {currentQuests.length === 0 ? (
                            <tr><td colSpan="6" style={{textAlign: 'center', padding: '20px', color: '#555'}}>NO MATCHING DATA FOUND.</td></tr>
                        ) : (
                            currentQuests.map(quest => (
                                <tr key={quest.id} className={quest.status === 'Archived' ? 'row-archived' : ''}>
                                    <td className="cell-id">{quest.id}</td>
                                    <td className="cell-title">{quest.title}</td>
                                    <td>{quest.type}</td>
                                    <td>{quest.location?.name || 'Unknown'}</td>
                                    <td><span className={`status-badge ${quest.status === 'Active' ? 'active' : 'archived'}`}>{quest.status}</span></td>
                                    <td className="cell-actions">
                                        <button className="btn-admin-edit" onClick={() => handleEdit(quest)}>Edit</button>
                                        <button className="btn-admin-delete" onClick={() => handleDeleteQuest(quest.id)}>Delete</button>
                                    </td>
                                </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                    {filteredQuests.length > 0 && (
                        <div className="pagination-controls">
                            <button className="btn-page" disabled={questPage === 1} onClick={() => setQuestPage(prev => prev - 1)}>← PREV</button>
                            <span className="page-indicator">PAGE {questPage} OF {totalQuestPages}</span>
                            <button className="btn-page" disabled={questPage === totalQuestPages} onClick={() => setQuestPage(prev => prev + 1)}>NEXT →</button>
                        </div>
                    )}

                    <div className="admin-analytics-grid">
                        <div className="admin-chart-box admin-donut-container">
                            <h3 className="chart-header">QUEST CATEGORY DISTRIBUTION</h3>
                            <div className="admin-donut-wrapper">
                                <div className="admin-donut-chart" style={{ background: conicGradient }}>
                                    <div className="admin-donut-hole">
                                        <span className="donut-total">{quests.length}</span>
                                        <span className="donut-total">TOTAL</span>
                                    </div>
                                </div>
                                <div className="admin-donut-legend">
                                    {Object.entries(typeCounts).map(([type, count]) => (
                                        <div key={type} className="admin-legend-item">
                                            <div
                                                className="admin-legend-color"
                                                style={{ backgroundColor: TYPE_COLORS[type] || '#fff', boxShadow: `0 0 8px ${TYPE_COLORS[type] || '#fff'}` }}>
                                            </div>
                                            <span className="admin-legend-label">{type.toUpperCase()} ({count})</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="admin-chart-box">
                            <h3 className="chart-header">DATABASE DIFFICULTY SPREAD</h3>
                            <div className="admin-bar-chart">
                                {[5, 4, 3, 2, 1].map((stars) => (
                                    <div key={stars} className="admin-bar-row">
                                        <div className="admin-bar-label">
                                            {renderVectorStars(stars)}
                                        </div>
                                        <div className="admin-bar-track">
                                            <div
                                                className="admin-bar-fill admin-fill-cyber"
                                                style={{ width: `${(difficultyCounts[stars] / maxDiffCount) * 100}%` }}
                                            ></div>
                                        </div>
                                        <span className="admin-bar-value">{difficultyCounts[stars]}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'events' && (
                <div className="admin-table-wrapper">
                    <div className="admin-toolbar">
                        <input
                            type="text"
                            className="admin-search-input"
                            placeholder="Search Events by ID, Name, or Location..."
                            value={eventSearch}
                            onChange={(e) => { setEventSearch(e.target.value); setEventPage(1); }}
                        />
                    </div>

                    <table className="admin-table">
                        <thead>
                        <tr>
                            {renderSortHeader('ID', 'id', eventSort, handleEventSort)}
                            {renderSortHeader('EVENT NAME', 'name', eventSort, handleEventSort)}
                            {renderSortHeader('LOCATION', 'location', eventSort, handleEventSort)}
                            {renderSortHeader('DATE / TIME', 'date', eventSort, handleEventSort)}
                            <th>ACTIONS</th>
                        </tr>
                        </thead>
                        <tbody>
                        {currentEvents.length === 0 ? (
                            <tr><td colSpan="5" style={{textAlign: 'center', padding: '20px', color: '#555'}}>NO MATCHING DATA FOUND.</td></tr>
                        ) : (
                            currentEvents.map(event => {
                                const targetDate = event.dateTime || event.date;
                                const eventDate = new Date(targetDate);
                                const isPast = eventDate < new Date();
                                return (
                                    <tr key={event.id} className={isPast ? 'row-archived' : ''}>
                                        <td className="cell-id">{event.id}</td>
                                        <td className="cell-title">{event.title || event.name}</td>
                                        <td>{typeof event.location === 'string' ? event.location : (event.location?.name || 'Unknown')}</td>
                                        <td>{eventDate.toLocaleString()}</td>
                                        <td className="cell-actions">
                                            <button className="btn-admin-edit" onClick={() => handleEditEvent(event)}>Edit</button>
                                            <button className="btn-admin-delete" onClick={() => handleDeleteEvent(event.id)}>Delete</button>
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                        </tbody>
                    </table>
                    {filteredEvents.length > 0 && (
                        <div className="pagination-controls">
                            <button className="btn-page" disabled={eventPage === 1} onClick={() => setEventPage(prev => prev - 1)}>← PREV</button>
                            <span className="page-indicator">PAGE {eventPage} OF {totalEventPages}</span>
                            <button className="btn-page" disabled={eventPage === totalEventPages} onClick={() => setEventPage(prev => prev + 1)}>NEXT →</button>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'suggestions' && (
                <div className="suggestions-list">
                    {suggestedQuests.length === 0 ? <p className="empty-state">No pending suggestions.</p> : null}
                    {suggestedQuests.map(req => (
                        <div key={req.id} className="suggestion-card">
                            <div className="sug-header"><h3>{req.title}</h3><span className="sug-author">By: {req.author}</span></div>
                            <p className="sug-desc">{req.description}</p>
                            <p className="sug-loc">📍 {req.location?.name}</p>
                            <div className="sug-actions">
                                <button className="btn-save" onClick={() => onAccept(req)}>ACCEPT & REWARD</button>
                                <button className="btn-admin-delete" onClick={() => onReject(req.id)}>REJECT</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {activeTab === 'security' && (
                <div className="admin-table-wrapper">
                    <div className="admin-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 style={{color: '#ff0055', textShadow: '0 0 10px #ff0055', margin: 0}}>🚨 ACTIVE THREAT OBSERVATION LIST</h2>
                        <button className="btn-admin-secondary" onClick={() => refetchThreats()}>↻ REFRESH LOGS</button>
                    </div>

                    <table className="admin-table">
                        <thead>
                        <tr>
                            <th>LOG ID</th>
                            <th>USER ID</th>
                            <th>REASON FOR FLAG</th>
                            <th>TIMESTAMP</th>
                            <th>STATUS</th>
                        </tr>
                        </thead>
                        <tbody>
                        {threatsLoading ? (
                            <tr><td colSpan="5" style={{textAlign: 'center', padding: '20px', color: '#00d9ff'}}>SCANNING SECURITY GRID...</td></tr>
                        ) : threats.length === 0 ? (
                            <tr><td colSpan="5" style={{textAlign: 'center', padding: '20px', color: '#00ffaa'}}>SYSTEM SECURE. NO THREATS DETECTED.</td></tr>
                        ) : (
                            threats.map(threat => (
                                <tr key={threat.id} style={{ borderLeft: '4px solid #ff0055', backgroundColor: 'rgba(255, 0, 85, 0.05)' }}>
                                    <td className="cell-id" title={threat.id}>{threat.id.substring(0, 8)}...</td>
                                    <td className="cell-title">{threat.userId}</td>
                                    <td style={{color: '#ffaa00'}}>{threat.reason}</td>
                                    <td>{new Date(threat.timestamp).toLocaleString()}</td>
                                    <td><span className="status-badge archived" style={{background: '#ff0055', color: 'white'}}>FLAGGED</span></td>
                                </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                </div>
            )}
            {isModalOpen && createPortal(
                <div className="admin-modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="admin-modal-content wide-modal" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal-title">{editingId ? 'EDIT QUEST' : 'CREATE NEW QUEST'}</h2>

                        <div className="admin-form-grid">
                            <div className="form-section span-2">
                                <h3>CORE DATA</h3>
                                <div className="grid-2-col">
                                    <div className="form-group">
                                        <label>TITLE</label>
                                        <input type="text" className={`admin-input ${questErrors.title ? 'input-error' : ''}`} value={formData.title} onChange={(e) => { setFormData({...formData, title: e.target.value}); setQuestErrors({...questErrors, title: null}); }} />
                                        {questErrors.title && <span className="error-text">{questErrors.title}</span>}
                                    </div>
                                    <div className="form-group">
                                        <label>TYPE</label>
                                        <select className="admin-input" value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})}>
                                            <option value="Exploration">Exploration</option><option value="Food">Food</option>
                                            <option value="Puzzle">Puzzle</option><option value="Athletics">Athletics</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group mt-1">
                                    <label>DESCRIPTION</label>
                                    <textarea className={`admin-input ${questErrors.description ? 'input-error' : ''}`} rows="2" value={formData.description} onChange={(e) => { setFormData({...formData, description: e.target.value}); setQuestErrors({...questErrors, description: null}); }}></textarea>
                                    {questErrors.description && <span className="error-text">{questErrors.description}</span>}
                                </div>
                            </div>

                            <div className="form-section span-2">
                                <h3>MEDIA & GPS</h3>
                                <div className="grid-2-col">
                                    <div className="form-group">
                                        <label>BACKGROUND IMAGE</label>
                                        {formData.backgroundImage && <img src={formData.backgroundImage} alt="Preview" className="admin-img-preview" />}
                                        <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleImageUpload} />
                                        <button className="btn-admin-secondary" onClick={() => fileInputRef.current.click()}>UPLOAD PHOTO</button>
                                    </div>
                                    <div className="form-group">
                                        <label>LOCATION NAME</label>
                                        <input type="text" className={`admin-input mb-1 ${questErrors.location ? 'input-error' : ''}`} placeholder="e.g., Central Park" value={formData.location.name} onChange={(e) => { setFormData({...formData, location: {...formData.location, name: e.target.value}}); setQuestErrors({...questErrors, location: null}); }} />
                                        {questErrors.location && <span className="error-text">{questErrors.location}</span>}

                                        <label style={{fontSize: '0.75rem', color: '#00ffaa', marginTop: '10px'}}>GPS COORDINATES (Lat, Lng)</label>
                                        <input
                                            type="text"
                                            className="admin-input"
                                            style={{padding: '8px'}}
                                            placeholder="46.7712, 23.5905"
                                            value={`${formData.location.lat}, ${formData.location.lng}`}
                                            onChange={(e) => {
                                                const parts = e.target.value.split(',');
                                                if (parts.length === 2) {
                                                    const lat = parseFloat(parts[0].trim());
                                                    const lng = parseFloat(parts[1].trim());
                                                    if (!isNaN(lat) && !isNaN(lng)) {
                                                        setFormData({...formData, location: {...formData.location, lat, lng}});
                                                    }
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="form-section span-2">
                                <h3>MECHANICS & CONDITIONS</h3>
                                <div className="grid-2-col">
                                    <div className="form-group">
                                        <label>DIFFICULTY (1-5)</label>
                                        <input type="number" min="1" max="5" className={`admin-input ${questErrors.difficulty ? 'input-error' : ''}`} value={formData.difficulty} onChange={(e) => { setFormData({...formData, difficulty: Number(e.target.value)}); setQuestErrors({...questErrors, difficulty: null}); }} />
                                        {questErrors.difficulty && <span className="error-text">{questErrors.difficulty}</span>}
                                    </div>
                                    <div className="form-group">
                                        <label>XP REWARD</label>
                                        <input type="number" className={`admin-input ${questErrors.xpReward ? 'input-error' : ''}`} value={formData.xpReward} onChange={(e) => { setFormData({...formData, xpReward: Number(e.target.value)}); setQuestErrors({...questErrors, xpReward: null}); }} />
                                        {questErrors.xpReward && <span className="error-text">{questErrors.xpReward}</span>}
                                    </div>

                                    <div className="form-group">
                                        <label>COST</label>
                                        <select className="admin-input" value={formData.cost} onChange={(e) => setFormData({...formData, cost: e.target.value})}>
                                            <option value="None">None</option>
                                            <option value="Cheap">Cheap</option>
                                            <option value="Moderate">Moderate</option>
                                            <option value="Expensive">Expensive</option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label>STATUS</label>
                                        <select className="admin-input" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                                            <option value="Active">Active</option>
                                            <option value="Archived">Archived</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid-3-col mt-1">
                                    <div className="form-group">
                                        <label>DAYTIME REQ.</label>
                                        <select className="admin-input" value={formData.conditions.daytime} onChange={(e) => setFormData({...formData, conditions: {...formData.conditions, daytime: e.target.value}})}>
                                            <option value="ANY">ANY</option>
                                            <option value="DAY">DAY</option>
                                            <option value="NIGHT">NIGHT</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>WEATHER REQ.</label>
                                        <select className="admin-input" value={formData.conditions.weather} onChange={(e) => setFormData({...formData, conditions: {...formData.conditions, weather: e.target.value}})}>
                                            <option value="ANY">ANY</option>
                                            <option value="CLEAR">CLEAR</option>
                                            <option value="CLOUDY">CLOUDY</option>
                                            <option value="RAINY">RAINY</option>
                                            <option value="SNOW">SNOW</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>SEASON REQ.</label>
                                        <select className="admin-input" value={formData.conditions.season} onChange={(e) => setFormData({...formData, conditions: {...formData.conditions, season: e.target.value}})}>
                                            <option value="ANY">ANY</option>
                                            <option value="SPRING">SPRING</option>
                                            <option value="SUMMER">SUMMER</option>
                                            <option value="AUTUMN">AUTUMN</option>
                                            <option value="WINTER">WINTER</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="modal-actions-grid">
                            <button className="btn-cancel" onClick={() => setIsModalOpen(false)}>CANCEL</button>
                            <button className="btn-save" onClick={handleSave}>SAVE TO DATABASE</button>
                        </div>
                    </div>
                </div>, document.body
            )}

            {isEventModalOpen && createPortal(
                <div className="admin-modal-overlay" onClick={() => setIsEventModalOpen(false)}>
                    <div className="admin-modal-content wide-modal" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal-title">{editingEventId ? 'EDIT EVENT' : 'CREATE NEW EVENT'}</h2>

                        <div className="admin-form-grid">
                            <div className="form-section span-2">
                                <h3>EVENT DATA</h3>
                                <div className="grid-2-col">
                                    <div className="form-group">
                                        <label>EVENT NAME</label>
                                        <input type="text" className={`admin-input ${eventErrors.title ? 'input-error' : ''}`} value={eventFormData.title} onChange={(e) => { setEventFormData({...eventFormData, title: e.target.value}); setEventErrors({...eventErrors, title: null}); }} />
                                        {eventErrors.title && <span className="error-text">{eventErrors.title}</span>}
                                    </div>
                                    <div className="form-group">
                                        <label>DATE & TIME</label>
                                        <input type="datetime-local" className={`admin-input ${eventErrors.date ? 'input-error' : ''}`} value={eventFormData.dateTime} onChange={(e) => { setEventFormData({...eventFormData, dateTime: e.target.value}); setEventErrors({...eventErrors, date: null}); }} />
                                        {eventErrors.date && <span className="error-text">{eventErrors.date}</span>}
                                    </div>
                                </div>
                                <div className="form-group mt-1">
                                    <label>DESCRIPTION</label>
                                    <textarea className={`admin-input ${eventErrors.description ? 'input-error' : ''}`} rows="2" value={eventFormData.description} onChange={(e) => { setEventFormData({...eventFormData, description: e.target.value}); setEventErrors({...eventErrors, description: null}); }}></textarea>
                                    {eventErrors.description && <span className="error-text">{eventErrors.description}</span>}
                                </div>
                            </div>

                            <div className="form-section span-2">
                                <h3>LOCATION & MEDIA</h3>
                                <div className="grid-2-col">
                                    <div className="form-group">
                                        <label>LOCATION MAPPING</label>
                                        <input type="text" className={`admin-input mb-1 ${eventErrors.location ? 'input-error' : ''}`} placeholder="Venue Name (e.g., Form Space)" value={typeof eventFormData.location === 'string' ? eventFormData.location : (eventFormData.location?.name || '')} onChange={(e) => { setEventFormData({...eventFormData, location: { name: e.target.value, lat: 46.7712, lng: 23.5905 }}); setEventErrors({...eventErrors, location: null}); }} />
                                        {eventErrors.location && <span className="error-text">{eventErrors.location}</span>}

                                        <label style={{fontSize: '0.75rem', color: '#00ffaa', marginTop: '10px'}}>GPS COORDINATES (Paste "Lat, Lng")</label>
                                        <input
                                            type="text"
                                            className="admin-input"
                                            style={{padding: '8px'}}
                                            placeholder="46.7712, 23.5905"
                                            value={typeof eventFormData.location === 'string' ? "46.7712, 23.5905" : `${eventFormData.location?.lat || 46.7712}, ${eventFormData.location?.lng || 23.5905}`}
                                            onChange={(e) => {
                                                const parts = e.target.value.split(',');
                                                if (parts.length === 2) {
                                                    const lat = parseFloat(parts[0].trim());
                                                    const lng = parseFloat(parts[1].trim());
                                                    if (!isNaN(lat) && !isNaN(lng)) {
                                                        const currentLocName = typeof eventFormData.location === 'string' ? eventFormData.location : (eventFormData.location?.name || '');
                                                        setEventFormData({...eventFormData, location: { name: currentLocName, lat, lng }});
                                                    }
                                                }
                                            }}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>PROMO IMAGE</label>
                                        {eventFormData.imageUrl && <img src={eventFormData.imageUrl} alt="Preview" className="admin-img-preview" />}
                                        <input type="file" accept="image/*" ref={eventFileInputRef} style={{ display: 'none' }} onChange={handleEventImageUpload} />
                                        <button className="btn-admin-secondary" onClick={() => eventFileInputRef.current.click()}>UPLOAD PHOTO</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="modal-actions-grid">
                            <button className="btn-cancel" onClick={() => setIsEventModalOpen(false)}>CANCEL</button>
                            <button className="btn-save" onClick={handleSaveEvent}>SAVE TO DATABASE</button>
                        </div>
                    </div>
                </div>, document.body
            )}
        </div>
    );
}