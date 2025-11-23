import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import './AsistenteVirtual.css';

function AsistenteVirtual() {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');

    const [messages, setMessages] = useState([
        { role: 'bot', content: '¡Hola! Soy la IA de la Clínica Ricardo Palma. Cuéntame, ¿cómo te sientes o qué síntomas tienes?' }
    ]);

    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);
    const { currentUser } = useAuth();

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // --- FUNCIÓN NUEVA: Detectar y renderizar enlaces ---
    const renderMessageWithLinks = (text) => {
        // Expresión regular para encontrar URLs (http o https)
        const urlRegex = /(https?:\/\/[^\s]+)/g;

        // Dividimos el texto por las URLs
        const parts = text.split(urlRegex);

        return parts.map((part, i) => {
            if (part.match(urlRegex)) {
                // Si es una URL, devolvemos un componente <a>
                return (
                    <a
                        key={i}
                        href={part}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#ffd700', textDecoration: 'underline', wordBreak: 'break-all' }} // Color amarillo/dorado para resaltar sobre azul, o adáptalo
                    >
                        {part}
                    </a>
                );
            }
            // Si es texto normal
            return part;
        });
    };
    // ----------------------------------------------------

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        try {
            const token = await currentUser.getIdToken();
            const history = messages.slice(1).slice(-10);

            const response = await axios.post('/api/chat',
                { message: userMsg.content, history: history },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const botMsg = { role: 'bot', content: response.data.response };
            setMessages(prev => [...prev, botMsg]);

        } catch (error) {
            console.error("Error chat:", error);
            setMessages(prev => [...prev, { role: 'bot', content: 'Lo siento, tuve un problema de conexión. Intenta de nuevo.' }]);
        }
        setIsTyping(false);
    };

    if (!isOpen) {
        return (
            <button className="chatbot-button" onClick={() => setIsOpen(true)} title="Asistente IA">
                🤖
            </button>
        );
    }

    return (
        <div className="chatbot-window">
            <div className="chatbot-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.5rem' }}>🤖</span>
                    <span>Asistente IA</span>
                </div>
                <button onClick={() => setIsOpen(false)}>×</button>
            </div>

            <div className="chatbot-body">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`bot-message ${msg.role === 'user' ? 'user-message-style' : ''}`}
                        style={{
                            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                            backgroundColor: msg.role === 'user' ? 'var(--primary-green)' : 'var(--white)',
                            color: msg.role === 'user' ? 'white' : 'var(--dark-text)',
                            border: msg.role === 'user' ? 'none' : '1px solid #eee',
                            maxWidth: '85%',
                            padding: '12px 16px',
                            borderRadius: '15px',
                            marginBottom: '10px',
                            lineHeight: '1.5',
                            fontSize: '0.95rem',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
                        }}
                    >
                        {/* Usamos la función de renderizado aquí */}
                        {renderMessageWithLinks(msg.content)}
                    </div>
                ))}
                {isTyping && <div className="bot-message" style={{ fontStyle: 'italic', color: '#999', background: 'none', border: 'none', boxShadow: 'none' }}>Escribiendo...</div>}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} style={{ padding: '15px', borderTop: '1px solid #eee', display: 'flex', gap: '10px', backgroundColor: 'white' }}>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ej. Tengo fiebre..."
                    style={{ flex: 1, padding: '12px', borderRadius: '25px', border: '1px solid #ddd', outline: 'none' }}
                />
                <button type="submit" disabled={isTyping} style={{ background: 'var(--primary-blue)', color: 'white', border: 'none', borderRadius: '50%', width: '45px', height: '45px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                    ➤
                </button>
            </form>
        </div>
    );
}

export default AsistenteVirtual;