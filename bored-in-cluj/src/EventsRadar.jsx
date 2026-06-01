import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './EventsRadar.css';

export default function EventsRadar({ events = [] }) {
    const [categorized, setCategorized] = useState({ today: [], upcoming: [], past: [] });
    const [selectedEvent, setSelectedEvent] = useState(null);

    const [attendanceData, setAttendanceData] = useState({});

    useEffect(() => {
        setAttendanceData(prev => {
            const newData = { ...prev };
            events.forEach(ev => {
                if (!newData[ev.id]) {
                    newData[ev.id] = { count: Math.floor(Math.random() * 300) + 50, isUserAttending: false };
                }
            });
            return newData;
        });

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const todayEnd = todayStart + (24 * 60 * 60 * 1000);

        const today = [];
        const upcoming = [];
        const past = [];

        events.forEach(event => {
            const targetTimeStr = event.dateTime || event.date;
            const eventTime = new Date(targetTimeStr).getTime();
            if (eventTime >= todayStart && eventTime < todayEnd) today.push(event);
            else if (eventTime >= todayEnd) upcoming.push(event);
            else past.push(event);
        });

        today.sort((a, b) => new Date(a.dateTime || a.date) - new Date(b.dateTime || b.date));
        upcoming.sort((a, b) => new Date(a.dateTime || a.date) - new Date(b.dateTime || b.date));
        past.sort((a, b) => new Date(b.dateTime || b.date) - new Date(a.dateTime || a.date));

        setCategorized({ today, upcoming, past });
    }, [events]);

    const toggleAttendance = (eventId) => {
        setAttendanceData(prev => {
            const current = prev[eventId];
            if (!current) return prev;
            return {
                ...prev,
                [eventId]: {
                    count: current.isUserAttending ? current.count - 1 : current.count + 1,
                    isUserAttending: !current.isUserAttending
                }
            };
        });
    };

    const formatTime = (dateString) => {
        const d = new Date(dateString);
        return d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).toUpperCase();
    };

    return (
        <div className="radar-container">
            <div className="radar-panel">
                <div className="radar-header">
                    <h2 className="radar-title">EVENTS</h2>
                    <div className="radar-status">LIVE FEED</div>
                </div>

                <div className="events-feed">
                    {categorized.today.map(event => (
                        <div key={event.id} className="event-card card-live">
                            <div className="event-image-wrapper">
                                <img src={event.imageUrl || event.photo || `https://via.placeholder.com/300x200/05050a/00ffaa?text=TODAY`} alt={event.title || event.name} />
                                <div className="badge-live">TODAY</div>
                            </div>
                            <div className="event-info">
                                <h4 className="event-name">{event.title || event.name}</h4>
                                <div className="event-meta">
                                    <span className="meta-time">{formatTime(event.dateTime || event.date)}</span>
                                    <span className="meta-loc">@ {typeof event.location === 'string' ? event.location : (event.location?.name || 'Unknown')}</span>
                                </div>
                                <div className="attendance-tracker">
                                    <span className="tracker-label">PEOPLE ATTENDING:</span>
                                    <div className="digital-counter-box">
                                        <span key={attendanceData[event.id]?.count} className="digital-number">
                                            {attendanceData[event.id]?.count || 0}
                                        </span>
                                    </div>
                                </div>
                                <p className="event-desc">{event.description}</p>
                                <button className="btn-event live-btn" onClick={() => setSelectedEvent(event)}>VIEW DETAILS</button>
                            </div>
                        </div>
                    ))}

                    {categorized.upcoming.map(event => (
                        <div key={event.id} className="event-card card-upcoming">
                            <div className="event-image-wrapper">
                                <img src={event.imageUrl || event.photo || `https://via.placeholder.com/300x200/05050a/00d9ff?text=UPCOMING`} alt={event.title || event.name} />
                            </div>
                            <div className="event-info">
                                <h4 className="event-name">{event.title || event.name}</h4>
                                <div className="event-meta">
                                    <span className="meta-time">{formatTime(event.dateTime || event.date)}</span>
                                    <span className="meta-loc">@ {typeof event.location === 'string' ? event.location : (event.location?.name || 'Unknown')}</span>
                                </div>
                                <div className="attendance-tracker">
                                    <span className="tracker-label">PEOPLE ATTENDING:</span>
                                    <div className="digital-counter-box">
                                         <span key={attendanceData[event.id]?.count} className="digital-number">
                                            {attendanceData[event.id]?.count || 0}
                                         </span>
                                    </div>
                                </div>
                                <p className="event-desc">{event.description}</p>
                                <button className="btn-event" onClick={() => setSelectedEvent(event)}>VIEW DETAILS</button>
                            </div>
                        </div>
                    ))}

                    {categorized.past.map(event => (
                        <div key={event.id} className="event-card card-past">
                            <div className="event-image-wrapper">
                                <img src={event.imageUrl || event.photo || `https://via.placeholder.com/300x200/111/555?text=PAST`} alt={event.title || event.name} />
                                <div className="badge-lost">ENDED</div>
                            </div>
                            <div className="event-info">
                                <h4 className="event-name">{event.title || event.name}</h4>
                                <div className="event-meta">
                                    <span className="meta-time">{formatTime(event.dateTime || event.date)}</span>
                                    <span className="meta-loc">@ {typeof event.location === 'string' ? event.location : (event.location?.name || 'Unknown')}</span>
                                </div>
                                <button className="btn-event" onClick={() => setSelectedEvent(event)}>VIEW ARCHIVE</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {selectedEvent && createPortal(
                <div className="event-modal-overlay" onClick={() => setSelectedEvent(null)}>
                    <div className="event-modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="btn-close-modal" onClick={() => setSelectedEvent(null)}>✕</button>
                        <div className="modal-header-image">
                            <img src={selectedEvent.imageUrl || selectedEvent.photo || `https://via.placeholder.com/800x400/05050a/00d9ff?text=EVENT`} alt={selectedEvent.title || selectedEvent.name} />
                        </div>
                        <div className="modal-body">
                            <h2 className="modal-title">{selectedEvent.title || selectedEvent.name}</h2>
                            <div className="modal-meta-bar">
                                <div className="meta-item">
                                    <span className="meta-label">DATE & TIME</span>
                                    <span className="meta-value">{formatTime(selectedEvent.dateTime || selectedEvent.date)}</span>
                                </div>
                                <div className="meta-item">
                                    <span className="meta-label">LOCATION</span>
                                    <span className="meta-value">{typeof selectedEvent.location === 'string' ? selectedEvent.location : (selectedEvent.location?.name || 'To Be Announced')}</span>
                                </div>
                            </div>
                            <div className="modal-split">
                                <div className="modal-description">
                                    <h3>ABOUT THIS EVENT</h3>
                                    <p>{selectedEvent.description}</p>
                                    <p>Gather your crew and prepare for a night in the city. Entry requires standard clearance.</p>
                                </div>
                                <div className="modal-map">
                                    {selectedEvent.location?.lat && selectedEvent.location?.lng ? (
                                        <iframe
                                            title="Event Location"
                                            src={`http://googleusercontent.com/maps.google.com/${selectedEvent.location.lat},${selectedEvent.location.lng}&t=k&z=16&output=embed`}
                                            width="100%"
                                            height="100%"
                                            style={{ border: 0 }}
                                            allowFullScreen=""
                                            loading="lazy"
                                        ></iframe>
                                    ) : (
                                        <div className="map-placeholder">MAP DATA UNAVAILABLE</div>
                                    )}
                                </div>
                            </div>
                            <div className="modal-actions">
                                {(() => {
                                    const isAttending = attendanceData[selectedEvent.id]?.isUserAttending;
                                    const isPast = new Date(selectedEvent.dateTime || selectedEvent.date).getTime() < new Date().getTime();
                                    if (isPast) return <button className="btn-action secondary-action" disabled>EVENT CONCLUDED</button>;
                                    return (
                                        <button className={`btn-action ${isAttending ? 'action-retract' : 'primary-action'}`} onClick={() => toggleAttendance(selectedEvent.id)}>
                                            {isAttending ? 'RETRACT ATTENDANCE' : 'WILL ATTEND'}
                                        </button>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}