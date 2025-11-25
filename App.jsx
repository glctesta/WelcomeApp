import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users,
    Briefcase,
    Clock,
    MapPin,
    CheckCircle,
    FileText,
    AlertCircle,
    Loader,
    Circle
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

const API_URL = 'http://localhost:3000';

function App() {
    // Stati principali
    const [visitors, setVisitors] = useState([]);
    const [pendingVisitors, setPendingVisitors] = useState([]);
    const [currentVisitorIndex, setCurrentVisitorIndex] = useState(0);
    const [roomStatus, setRoomStatus] = useState(null);

    // Stati per check-in
    const [showCheckInModal, setShowCheckInModal] = useState(false);
    const [selectedVisitor, setSelectedVisitor] = useState(null);
    const [pdfScrolled, setPdfScrolled] = useState(false);
    const [showPdfViewer, setShowPdfViewer] = useState(false);
    const [pdfUrl, setPdfUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const [printingVisitor, setPrintingVisitor] = useState(null); // Stato per la stampa

    const pdfContainerRef = useRef(null);

    // Stati per media slideshow (fallback)
    const [mediaFiles, setMediaFiles] = useState([]);
    const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

    // Stati per messaggi multilingua
    const [currentLanguageIndex, setCurrentLanguageIndex] = useState(0);
    const [currentRoomLangIndex, setCurrentRoomLangIndex] = useState(0);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Messaggi di benvenuto in 13 lingue
    const welcomeMessages = [
        { lang: 'it', text: 'Benvenuto', locale: 'it-IT', noVisitors: 'Nessun visitatore oggi', noVisitorsDesc: 'Non ci sono visitatori registrati per oggi' },
        { lang: 'ro', text: 'Bun venit', locale: 'ro-RO', noVisitors: 'Niciun vizitator astăzi', noVisitorsDesc: 'Nu există vizitatori înregistrați pentru astăzi' },
        { lang: 'de', text: 'Willkommen', locale: 'de-DE', noVisitors: 'Keine Besucher heute', noVisitorsDesc: 'Für heute sind keine Besucher registriert' },
        { lang: 'en', text: 'Welcome', locale: 'en-GB', noVisitors: 'No visitors today', noVisitorsDesc: 'There are no visitors registered for today' },
        { lang: 'sr', text: 'Добродошли', locale: 'sr-RS', noVisitors: 'Нема посетилаца данас', noVisitorsDesc: 'Нема регистрованих посетилаца за данас' },
        { lang: 'hu', text: 'Üdvözöljük', locale: 'hu-HU', noVisitors: 'Ma nincsenek látogatók', noVisitorsDesc: 'Ma nincsenek regisztrált látogatók' },
        { lang: 'es', text: 'Bienvenido', locale: 'es-ES', noVisitors: 'No hay visitantes hoy', noVisitorsDesc: 'No hay visitantes registrados para hoy' },
        { lang: 'pt', text: 'Bem-vindo', locale: 'pt-PT', noVisitors: 'Sem visitantes hoje', noVisitorsDesc: 'Não há visitantes registrados para hoje' },
        { lang: 'gd', text: 'Fàilte', locale: 'en-GB', noVisitors: 'No visitors today', noVisitorsDesc: 'There are no visitors registered for today' },
        { lang: 'fr', text: 'Bienvenue', locale: 'fr-FR', noVisitors: 'Aucun visiteur aujourd\'hui', noVisitorsDesc: 'Il n\'y a pas de visiteurs enregistrés pour aujourd\'hui' },
        { lang: 'sv', text: 'Välkommen', locale: 'sv-SE', noVisitors: 'Inga besökare idag', noVisitorsDesc: 'Det finns inga registrerade besökare för idag' },
        { lang: 'sq', text: 'Mirë se vini', locale: 'sq-AL', noVisitors: 'Asnjë vizitor sot', noVisitorsDesc: 'Nuk ka vizitorë të regjistruar për sot' },
        { lang: 'el', text: 'Καλώς ήρθατε', locale: 'el-GR', noVisitors: 'Κανένας επισκέπτης σήμερα', noVisitorsDesc: 'Δεν υπάρχουν εγγεγραμμένοι επισκέτες για σήμερα' }
    ];

    // Messaggi sala riunioni in 4 lingue (IT, EN, RO, SV)
    const roomStatusMessages = {
        free: ['LIBERA', 'FREE', 'LIBERĂ', 'LEDIG'],
        occupied: ['OCCUPATA', 'OCCUPIED', 'OCUPATĂ', 'UPPTAGEN'],
        reason: ['Motivo', 'Reason', 'Motiv', 'Anledning'],
        upTo: ['Fino a', 'Up to', 'Până la', 'Till']
    };

    // Messaggi combobox check-in in 3 lingue (IT, RO, EN)
    const checkInMessages = [
        { lang: 'it', title: 'Check-in Visitatori', placeholder: 'Seleziona un visitatore...' },
        { lang: 'ro', title: 'Check-in Vizitatori', placeholder: 'Selectați un vizitator...' },
        { lang: 'en', title: 'Visitor Check-in', placeholder: 'Select a visitor...' }
    ];

    // Messaggi modal PDF in 4 lingue (IT, RO, EN, SV)
    const pdfModalMessages = [
        {
            lang: 'it',
            title: 'Documento Privacy & Sicurezza',
            visitor: 'Visitatore',
            company: 'Azienda',
            loading: 'Caricamento documento...',
            cancel: 'Annulla',
            accept: 'Accetto e Procedi',
            waitMessage: 'Attendi 5 secondi per abilitare il pulsante...',
            readyMessage: 'Puoi procedere con l\'accettazione',
            scrollMessage: 'Scorri il documento fino alla fine per abilitare il pulsante "Accetta e Procedi".'
        },
        {
            lang: 'ro',
            title: 'Document Confidențialitate & Securitate',
            visitor: 'Vizitator',
            company: 'Companie',
            loading: 'Se încarcă documentul...',
            cancel: 'Anulare',
            accept: 'Accept și Continuă',
            waitMessage: 'Așteptați 5 secunde pentru a activa butonul...',
            readyMessage: 'Puteți continua cu acceptarea',
            scrollMessage: 'Derulați documentul până la sfârșit pentru a activa butonul "Accept și Continuă".'
        },
        {
            lang: 'en',
            title: 'Privacy & Security Document',
            visitor: 'Visitor',
            company: 'Company',
            loading: 'Loading document...',
            cancel: 'Cancel',
            accept: 'Accept and Proceed',
            waitMessage: 'Wait 5 seconds to enable the button...',
            readyMessage: 'You can proceed with acceptance',
            scrollMessage: 'Scroll to the end of the document to enable the "Accept and Proceed" button.'
        },
        {
            lang: 'sv',
            title: 'Integritet & Säkerhetsdokument',
            visitor: 'Besökare',
            company: 'Företag',
            loading: 'Laddar dokument...',
            cancel: 'Avbryt',
            accept: 'Acceptera och Fortsätt',
            waitMessage: 'Vänta 5 sekunder för att aktivera knappen...',
            readyMessage: 'Du kan fortsätta med acceptans',
            scrollMessage: 'Skrolla till slutet av dokumentet för att aktivera knappen "Acceptera och Fortsätt".'
        }
    ];

    // ============================================
    // Carica visitatori con check-in fatto (per slideshow)
    // ============================================
    const loadVisitors = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/visitors`);
            console.log('📊 Visitors API response:', response.data);
            if (Array.isArray(response.data)) {
                // MOSTRA TUTTI I VISITATORI DEL GIORNO (non solo quelli con check-in fatto)
                setVisitors(response.data);
                console.log('✅ All visitors for today:', response.data.length, response.data);
            } else {
                console.error("API visitors returned non-array:", response.data);
                setVisitors([]);
            }
        } catch (error) {
            console.error('❌ Errore caricamento visitatori:', error);
        }
    };

    // ============================================
    // Carica visitatori in attesa di check-in
    // ============================================
    const loadPendingVisitors = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/visitors/pending-checkin`);
            if (Array.isArray(response.data)) {
                setPendingVisitors(response.data);
            } else {
                console.error("API pending-checkin returned non-array:", response.data);
                setPendingVisitors([]);
            }
        } catch (error) {
            console.error('❌ Errore caricamento pending visitors:', error);
        }
    };

    // ============================================
    // Carica lista media per slideshow fallback
    // ============================================
    const loadMediaList = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/media-list`);
            if (Array.isArray(response.data)) {
                setMediaFiles(response.data);
            }
        } catch (error) {
            console.error('❌ Errore caricamento media:', error);
        }
    };

    // ============================================
    // Carica stato sala riunioni
    // ============================================
    const loadRoomStatus = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/room-status`);
            setRoomStatus(response.data);
        } catch (error) {
            console.error('❌ Errore caricamento stato sala:', error);
        }
    };

    // ============================================
    // Carica PDF da SQL Server
    // ============================================
    const loadPdfDocument = () => {
        setLoading(true);
        // Use PDF.js viewer with the API endpoint as the file parameter
        const pdfApiUrl = `${API_URL}/api/visitor-document?t=${new Date().getTime()}`;
        const viewerUrl = `/pdfjs/web/viewer.html?file=${encodeURIComponent(pdfApiUrl)}`;
        setPdfUrl(viewerUrl);
        setLoading(false);

        // Since we can't detect scroll in iframe, enable accept button after 5 seconds
        // This gives user time to review the document
        setTimeout(() => {
            setPdfScrolled(true);
        }, 5000); // 5 secondi
    };

    // ============================================
    // Effect: Caricamento iniziale e polling
    // ============================================
    useEffect(() => {
        loadVisitors();
        loadPendingVisitors();
        loadRoomStatus();
        loadMediaList();

        // Polling ogni 10 secondi per aggiornare i dati
        const interval = setInterval(() => {
            console.log('⏰ Polling interval triggered');
            loadVisitors();
            loadPendingVisitors(); // Aggiorna anche il combobox
            loadRoomStatus();
        }, 10000); // Aggiorna ogni 10 secondi

        return () => clearInterval(interval);
    }, []);

    // ============================================
    // Effect: Slideshow timer (Media fallback)
    // ============================================
    useEffect(() => {
        if (showCheckInModal) {
            // Non avviare slideshow se il modal di check-in è aperto
            return;
        }

        if (mediaFiles.length > 0) {
            const timer = setInterval(() => {
                setCurrentMediaIndex(prev => (prev + 1) % mediaFiles.length);
            }, 15000); // 15 secondi per immagine
            return () => clearInterval(timer);
        }
    }, [mediaFiles.length, showCheckInModal]);

    // ============================================
    // Effect: Rotazione visitatori (dopo ciclo completo lingue)
    // ============================================
    useEffect(() => {
        if (visitors.length > 1) {
            // Cambia visitatore ogni 13 secondi (13 lingue × 1 secondo)
            const timer = setInterval(() => {
                setCurrentVisitorIndex(prev => (prev + 1) % visitors.length);
            }, 13000); // 13 secondi per ciclo completo
            return () => clearInterval(timer);
        }
    }, [visitors.length]);

    // ============================================
    // Effect: Rotazione SOLO saluto benvenuto (ogni 1 secondo)
    // ============================================
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentLanguageIndex(prev => (prev + 1) % welcomeMessages.length);
        }, 1000); // 1 secondo per lingua
        return () => clearInterval(timer);
    }, []);

    // ============================================
    // Effect: Rotazione lingua sala riunioni (ogni 4 secondi)
    // ============================================
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentRoomLangIndex(prev => (prev + 1) % 4);
        }, 4000); // 4 secondi
        return () => clearInterval(timer);
    }, []);

    // ============================================
    // Effect: Aggiornamento ora corrente
    // ============================================
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // ============================================
    // Gestione scroll PDF
    // ============================================
    const handlePdfScroll = (e) => {
        const element = e.target;
        const scrolledToBottom =
            element.scrollHeight - element.scrollTop <= element.clientHeight + 100;

        if (scrolledToBottom && !pdfScrolled) {
            setPdfScrolled(true);
        }
    };

    // ============================================
    // Effect: Gestione Stampa
    // ============================================
    useEffect(() => {
        if (printingVisitor) {
            const timer = setTimeout(() => {
                window.print();
                setPrintingVisitor(null);
            }, 500); // Ritardo per permettere il rendering
            return () => clearTimeout(timer);
        }
    }, [printingVisitor]);

    // ============================================
    // Seleziona visitatore e carica PDF
    // ============================================
    const handleSelectVisitor = (visitor) => {
        setSelectedVisitor(visitor);
        setShowPdfViewer(true);
        setPdfScrolled(false);
        loadPdfDocument();
    };

    // ============================================
    // Accetta documento e procedi con check-in
    // ============================================
    const handleAcceptDocument = async () => {
        if (!selectedVisitor) return;

        try {
            setLoading(true);

            // 1. Aggiorna DocAcceptedDate
            await axios.post(`${API_URL}/api/visitors/accept-document/${selectedVisitor.VisitorId}`);

            // 2. Effettua check-in
            const response = await axios.post(`${API_URL}/api/visitors/checkin/${selectedVisitor.VisitorId}`);

            // 3. Ricarica dati
            if (response.data.success) {
                // Imposta il visitatore per la stampa
                setPrintingVisitor(selectedVisitor);

                // Ricarica i dati senza mostrare alert
                loadVisitors();
                loadPendingVisitors();
                setShowPdfViewer(false);
                setSelectedVisitor(null);
                setPdfUrl(null);
            }
        } catch (err) {
            console.error('Errore check-in:', err);
        } finally {
            setLoading(false);
        }
    };

    // ============================================
    // Annulla selezione visitatore
    // ============================================
    const handleCancelSelection = () => {
        setShowPdfViewer(false);
        setSelectedVisitor(null);
        setPdfScrolled(false);
        setPdfUrl(null);
    };

    return (
        <div className="min-h-screen bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900 via-slate-900 to-black relative overflow-hidden text-white selection:bg-blue-500 selection:text-white">
            {/* ============================================ */}
            {/* HEADER: Orologio Digitale (sinistra) e Logo (destra) */}
            {/* ============================================ */}
            <div className="fixed top-0 left-0 right-0 z-40 flex justify-between items-start p-8">
                <div className="flex flex-col">
                    {/* ORA */}
                    <div className="flex items-center">
                        <Clock className="w-10 h-10 text-blue-500 mr-4" />
                        <span className="text-7xl font-bold text-blue-500 tracking-tighter font-mono">
                            {currentTime.toLocaleTimeString('it-IT', {
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </span>
                    </div>
                    {/* DATA */}
                    <div className="text-xl font-light text-slate-400 tracking-[0.3em] uppercase mt-2 ml-14">
                        {currentTime.toLocaleDateString(welcomeMessages[currentLanguageIndex].locale, {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long'
                        })}
                    </div>
                </div>

                {/* Logo */}
                <img
                    src="/logo.png"
                    alt="Logo"
                    className="h-16 object-contain opacity-80"
                />

                {/* Spazio vuoto per bilanciare */}
                <div className="w-10"></div>
            </div>

            {/* ============================================ */}
            {/* DROPDOWN CHECK-IN (Sempre visibile se ci sono pending) */}
            {/* ============================================ */}
            {pendingVisitors.length > 0 && !showPdfViewer && (
                <div className="fixed top-4 right-4 z-50 w-96">
                    <div className="bg-white rounded-xl shadow-2xl p-4 border-2 border-blue-500">
                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center">
                            <Users className="w-4 h-4 mr-2 text-blue-600" />
                            {checkInMessages[currentLanguageIndex % 3].title} ({pendingVisitors.length})
                        </label>
                        <select
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 text-gray-900"
                            onChange={(e) => {
                                const visitorId = parseInt(e.target.value);
                                const visitor = pendingVisitors.find(v => v.VisitorId === visitorId);
                                if (visitor) {
                                    handleSelectVisitor(visitor);
                                }
                            }}
                            value=""
                        >
                            <option value="" disabled>{checkInMessages[currentLanguageIndex % 3].placeholder}</option>
                            {pendingVisitors.map((visitor) => (
                                <option key={visitor.VisitorId} value={visitor.VisitorId}>
                                    {visitor.GuestName} - {visitor.CompanyName}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            )}

            {/* ============================================ */}
            {/* MODAL PDF VIEWER (Solo quando selezionato) */}
            {/* ============================================ */}
            {showPdfViewer && selectedVisitor && (
                <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white rounded-2xl shadow-2xl p-8 max-w-5xl w-full h-[90vh] flex flex-col"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                                <FileText className="inline mr-3 text-blue-600" />
                                {pdfModalMessages[currentLanguageIndex % 4].title}
                            </h2>
                            <button
                                onClick={handleCancelSelection}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                ✕
                            </button>
                        </div>
                        {/* PDF VIEWER */}
                        <div className="mb-4">
                            <p className="text-xl font-semibold text-gray-800">
                                {pdfModalMessages[currentLanguageIndex % 4].visitor}: {selectedVisitor.GuestName}
                            </p>
                            <p className="text-lg text-gray-600">
                                {pdfModalMessages[currentLanguageIndex % 4].company}: {selectedVisitor.CompanyName}
                            </p>
                            <p className="text-sm text-gray-600 mt-1 flex items-center">
                                <AlertCircle className="inline w-4 h-4 mr-2 text-orange-500" />
                                {pdfModalMessages[currentLanguageIndex % 4].scrollMessage}
                            </p>
                        </div>

                        {loading ? (
                            <div className="flex items-center justify-center h-96">
                                <Loader className="w-12 h-12 animate-spin text-blue-600" />
                                <p className="ml-4 text-gray-600">{pdfModalMessages[currentLanguageIndex % 4].loading}</p>
                            </div>
                        ) : (
                            <div
                                ref={pdfContainerRef}
                                className="border-2 border-gray-300 rounded-lg overflow-hidden flex-1 bg-gray-50"
                                onScroll={handlePdfScroll}
                                style={{ height: '500px', overflowY: 'auto' }}
                            >
                                {pdfUrl ? (
                                    <iframe
                                        src={pdfUrl}
                                        className="w-full h-full"
                                        title="Documento Privacy"
                                        style={{ minHeight: '500px', border: 'none' }}
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full">
                                        <p className="text-gray-500">Nessun documento disponibile</p>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex gap-4 mt-6">
                            <button
                                onClick={handleCancelSelection}
                                disabled={loading}
                                className="flex-1 py-3 bg-gray-300 hover:bg-gray-400 disabled:bg-gray-200 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
                            >
                                {pdfModalMessages[currentLanguageIndex % 4].cancel}
                            </button>

                            <button
                                onClick={handleAcceptDocument}
                                disabled={!pdfScrolled || loading}
                                className={`flex-1 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${pdfScrolled && !loading
                                    ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    }`}
                            >
                                {loading ? (
                                    <>
                                        <Loader className="w-5 h-5 animate-spin" />
                                        {pdfModalMessages[currentLanguageIndex % 4].processing}
                                    </>
                                ) : pdfScrolled ? (
                                    <>
                                        <CheckCircle className="w-5 h-5" />
                                        {pdfModalMessages[currentLanguageIndex % 4].accept}
                                    </>
                                ) : (
                                    <>
                                        <Clock className="w-5 h-5" />
                                        {pdfModalMessages[currentLanguageIndex % 4].waitMessage}
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* ============================================ */}
            {/* SLIDESHOW VISITATORI (solo con check-in fatto) */}
            {/* ============================================ */}
            {(() => {
                console.log('🔍 Visitor slideshow check:', {
                    showCheckInModal,
                    visitorsLength: visitors.length,
                    visitors: visitors,
                    shouldShow: !showCheckInModal && visitors.length > 0
                });
                return !showCheckInModal && visitors.length > 0;
            })() && (
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentVisitorIndex}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.05 }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                                className="text-center max-w-7xl mx-auto px-4"
                            >
                                {/* Messaggio di benvenuto */}
                                <h3 className="text-3xl md:text-4xl font-light text-blue-300 tracking-[0.5em] uppercase mb-8">
                                    {welcomeMessages[currentLanguageIndex].text}
                                </h3>

                                {/* Foto (Opzionale, se presente) */}
                                {visitors[currentVisitorIndex].PhotoPath && (
                                    <img
                                        src={`${API_URL}${visitors[currentVisitorIndex].PhotoPath}`}
                                        alt="Visitor"
                                        className="w-48 h-48 rounded-full mx-auto mb-10 object-cover border-4 border-blue-500/30 shadow-2xl"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                        }}
                                    />
                                )}

                                {/* Nome visitatore - MASSIVE */}
                                <h1 className="text-7xl md:text-9xl font-black text-white mb-12 tracking-tight uppercase drop-shadow-2xl">
                                    {visitors[currentVisitorIndex].GuestName}
                                </h1>

                                {/* Azienda - Pill Style */}
                                <div className="inline-block bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-full px-12 py-4 mb-12">
                                    <p className="text-3xl text-slate-200 font-bold tracking-wide uppercase">
                                        {visitors[currentVisitorIndex].CompanyName}
                                    </p>
                                </div>

                                {/* Quote / Footer Message */}
                                <p className="text-xl text-slate-500 italic font-light">
                                    "Have a nice journey"
                                </p>

                                {/* Dots indicator (fake for visual match) */}
                                <div className="flex justify-center gap-3 mt-8">
                                    {[...Array(8)].map((_, i) => (
                                        <div key={i} className={`w-3 h-3 rounded-full ${i === 4 ? 'bg-blue-500' : 'bg-slate-700'}`}></div>
                                    ))}
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                )}

            {/* Messaggio quando non ci sono visitatori */}
            {/* ============================================ */}
            {/* MEDIA SLIDESHOW (Fallback se nessun visitatore) */}
            {/* ============================================ */}
            {!showCheckInModal && !showPdfViewer && visitors.length === 0 && pendingVisitors.length === 0 && mediaFiles.length > 0 && (
                <div className="fixed inset-0 z-0 overflow-hidden">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentMediaIndex}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 1.5 }}
                            className="w-full h-full flex items-center justify-center bg-black"
                        >
                            {mediaFiles[currentMediaIndex].endsWith('.mp4') || mediaFiles[currentMediaIndex].endsWith('.webm') ? (
                                <video
                                    src={`/media/${mediaFiles[currentMediaIndex]}`}
                                    autoPlay
                                    muted
                                    loop
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <img
                                    src={`/media/${mediaFiles[currentMediaIndex]}`}
                                    alt="Media Slideshow"
                                    className="w-full h-full object-cover"
                                />
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            )}

            {/* Messaggio quando non ci sono visitatori E non ci sono media */}
            {
                !showCheckInModal && visitors.length === 0 && mediaFiles.length === 0 && (
                    <div className="container mx-auto px-4 py-12 relative z-10">
                        <div className="bg-white rounded-3xl shadow-2xl p-12 max-w-4xl mx-auto text-center">
                            <Users className="w-24 h-24 mx-auto text-gray-300 mb-6" />
                            <h2 className="text-4xl font-bold text-gray-400 mb-4">
                                {welcomeMessages[currentLanguageIndex].noVisitors}
                            </h2>
                            <p className="text-xl text-gray-500">
                                {welcomeMessages[currentLanguageIndex].noVisitorsDesc}
                            </p>
                        </div>
                    </div>
                )
            }

            {/* ============================================ */}
            {/* FOOTER: ROOM STATUS (Fixed Bottom) */}
            {/* ============================================ */}
            {
                roomStatus && (
                    <div className={`fixed bottom-0 left-0 right-0 h-24 flex items-center px-12 z-50 transition-colors duration-500 ${roomStatus.isOccupied ? 'bg-red-900/95' : 'bg-emerald-900/95'
                        }`}>
                        {/* Icon Container */}
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mr-8 ${roomStatus.isOccupied ? 'bg-red-800' : 'bg-emerald-800'
                            }`}>
                            {roomStatus.isOccupied ? (
                                <Users className="w-8 h-8 text-white" />
                            ) : (
                                <CheckCircle className="w-8 h-8 text-white" />
                            )}
                        </div>

                        {/* Status Text */}
                        <div className="flex-grow flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-white/70 tracking-[0.2em] uppercase mb-1">
                                    {roomStatus.roomName || 'MEETING ROOM STATUS'}
                                </p>
                                <h2 className="text-4xl font-black text-white uppercase tracking-wide">
                                    {roomStatus.isOccupied
                                        ? roomStatusMessages.occupied[currentRoomLangIndex]
                                        : roomStatusMessages.free[currentRoomLangIndex]
                                    }
                                </h2>
                            </div>

                            {/* Meeting Details (Right Side) */}
                            {roomStatus.isOccupied && roomStatus.currentBooking && (
                                <div className="text-right border-l border-white/20 pl-8">
                                    <p className="text-xl font-bold text-white">
                                        {roomStatus.currentBooking.MeetingTitle || roomStatus.currentBooking.Organizer}
                                    </p>
                                    <p className="text-sm text-white/70">
                                        {roomStatusMessages.upTo[currentRoomLangIndex]} {new Date(roomStatus.currentBooking.EndTime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )
            }
            {/* ============================================ */}
            {/* SEZIONE DI STAMPA (Visibile solo in stampa) */}
            {/* ============================================ */}
            {printingVisitor && (
                <div id="print-section" className="hidden print:block bg-white text-black font-sans overflow-hidden" style={{ width: '8cm', height: '7cm', padding: '2mm' }}>
                    <div className="flex flex-col items-center text-center h-full justify-between">
                        {/* Logo Azienda */}
                        <img src="/logo.png" alt="Vandewiele" className="h-10 object-contain mb-1" />

                        {/* Nome Visitatore */}
                        <div className="flex-grow flex flex-col justify-center">
                            <h1 className="text-2xl font-black uppercase leading-tight mb-1">
                                {printingVisitor.GuestName}
                            </h1>

                            {/* Azienda Visitatore */}
                            <h3 className="text-lg font-semibold leading-tight">
                                {printingVisitor.CompanyName}
                            </h3>
                        </div>

                        <div className="w-full border-b-2 border-black my-1"></div>

                        <div className="w-full flex justify-between items-end">
                            <div className="text-left">
                                <p className="text-xs font-bold uppercase text-gray-600">Sponsor:</p>
                                <p className="text-sm font-bold truncate max-w-[4cm]">{printingVisitor.SponsorGuy}</p>
                            </div>

                            <div className="ml-2">
                                <QRCodeSVG
                                    value={printingVisitor.VisitorId.toString()}
                                    size={60}
                                    level="H"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;
