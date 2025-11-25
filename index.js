const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Middleware per Content Security Policy (CSP) - MOVED TO TOP
app.use((req, res, next) => {
    res.removeHeader("Content-Security-Policy");
    res.removeHeader("X-Content-Security-Policy");
    res.removeHeader("X-WebKit-CSP");

    res.setHeader(
        "Content-Security-Policy",
        "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; script-src * 'unsafe-inline' 'unsafe-eval'; connect-src *; img-src * data: blob:; style-src * 'unsafe-inline'; frame-src * data: blob:; child-src * data: blob:;"
    );
    next();
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/media', express.static(path.join(__dirname, 'client/public/media')));
app.use(express.static(path.join(__dirname, 'client/dist')));

// Configurazione database SQL Server
const dbConfig = {
    user: 'emsreset',
    password: 'E6QhqKUxHFXTbkB7eA8c9ya',
    server: 'roghipsql01.vandewiele.local',
    database: 'Employee',
    port: 1434,
    options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

// Test connessione database
sql.connect(dbConfig)
    .then(() => console.log('✅ Connesso a SQL Server'))
    .catch(err => console.error('❌ Errore connessione database:', err));

// ============================================
// ENDPOINT: Ottieni tutti i visitatori del giorno
// ============================================
app.get('/api/visitors', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query(`
             SELECT [VisitorId]     
      ,[CompanyName]
      ,[GuestName]
      ,[StartVisit]
      ,[EndVisit]
      ,isnull([SponsorGuy],'') as SponsorGuy
      ,[CheckIn]
      ,[DocAcceptedDate]
    FROM [Employee].[dbo].[Visitors]
            WHERE GETDATE() between [ShowFrom] and [ShowUntil]
            ORDER BY [ShowFrom]
        `);

        res.json(result.recordset);
    } catch (err) {
        console.error('❌ Errore nel recupero visitatori:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// ENDPOINT: Ottieni visitatori senza check-in
// ============================================
app.get('/api/visitors/pending-checkin', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query(`
            SELECT [VisitorId]     
      ,[CompanyName]
      ,[GuestName]
      ,[StartVisit]
      ,[EndVisit]
      ,isnull([SponsorGuy],'') as SponsorGuy
      ,[CheckIn]
      ,[DocAcceptedDate]
  FROM [Employee].[dbo].[Visitors]
            WHERE GETDATE() between [ShowFrom] and [ShowUntil]
              AND CheckIn IS NULL
            ORDER BY [ShowFrom]
        `);

        res.json(result.recordset);
    } catch (err) {
        console.error('❌ Errore nel recupero visitatori pending:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// ENDPOINT: Ottieni PDF documento generale (varbinary)
// ============================================
app.get('/api/visitor-document', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query(`
            SELECT[DocGeneral]
            FROM[Employee].[dbo].[VisitorDocs]
            WHERE dateout IS NULL
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Nessun documento trovato' });
        }

        const pdfBuffer = result.recordset[0].DocGeneral;

        if (!pdfBuffer) {
            return res.status(404).json({ error: 'Documento vuoto' });
        }

        // Invia il PDF come risposta
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="visitor-document.pdf"');
        res.send(pdfBuffer);

    } catch (err) {
        console.error('❌ Errore nel recupero documento PDF:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// ENDPOINT: Aggiorna DocAcceptedDate dopo accettazione PDF
// ============================================
app.post('/api/visitors/accept-document/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await sql.connect(dbConfig);

        await pool.request()
            .input('visitorId', sql.Int, id)
            .query(`
                UPDATE[Employee].[dbo].[Visitors]
                SET DocAcceptedDate = GETDATE()
                WHERE VisitorId = @visitorId
            `);

        res.json({
            success: true,
            message: 'Documento accettato con successo',
            timestamp: new Date()
        });

    } catch (err) {
        console.error('❌ Errore aggiornamento documento:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// ENDPOINT: Effettua check-in visitatore
// ============================================
app.post('/api/visitors/checkin/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await sql.connect(dbConfig);

        await pool.request()
            .input('visitorId', sql.Int, id)
            .query(`
                UPDATE[Employee].[dbo].[Visitors]
                SET CheckIn = GETDATE()
                WHERE VisitorId = @visitorId
            `);

        res.json({
            success: true,
            message: 'Check-in completato',
            timestamp: new Date()
        });

    } catch (err) {
        console.error('❌ Errore check-in:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// Carica configurazione stanza
let roomConfig = { roomName: 'Board Room' }; // Default
try {
    const configPath = path.join(__dirname, 'roomConfig.json');
    if (fs.existsSync(configPath)) {
        const configFile = fs.readFileSync(configPath, 'utf8');
        roomConfig = JSON.parse(configFile);
        console.log(`✅ Configurazione stanza caricata: ${roomConfig.roomName}`);
    } else {
        console.warn('⚠️ File roomConfig.json non trovato, uso default:', roomConfig.roomName);
    }
} catch (err) {
    console.error('❌ Errore caricamento roomConfig.json:', err);
}

// ============================================
// ENDPOINT: Stato sala riunioni (RoomBookings)
// ============================================
app.get('/api/room-status', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('roomName', sql.NVarChar, roomConfig.roomName)
            .query(`           
            SELECT 
                BookingId,
            RoomName,
            MeetingTitle,
            StartTime,
            EndTime,
            Organizer
            FROM[Employee].[dbo].[RoomBookings]
            WHERE GETDATE() BETWEEN StartTime AND EndTime
              AND BookingStatus = 'Confirmed'
              AND RoomName = @roomName
            ORDER BY StartTime
            `);

        const isOccupied = result.recordset.length > 0;

        // Trova prossimo slot libero
        let nextFreeTime = null;
        if (isOccupied) {
            const currentBooking = result.recordset[0];
            nextFreeTime = currentBooking.BookingEnd;
        }

        res.json({
            isOccupied,
            currentBooking: isOccupied ? result.recordset[0] : null,
            nextFreeTime,
            allBookings: result.recordset,
            roomName: roomConfig.roomName
        });

    } catch (err) {
        console.error('❌ Errore nel recupero stato sala:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// ENDPOINT: Tutte le prenotazioni del giorno
// ============================================
app.get('/api/room-bookings/today', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query(`            
                SELECT 
                BookingId,
            RoomName,
            StartTime,
            EndTime,
            Organizer
            FROM[Employee].[dbo].[RoomBookings]
            WHERE GETDATE() BETWEEN StartTime AND EndTime
              AND BookingStatus = 'Confirmed'
            ORDER BY StartTime
            `);

        res.json(result.recordset);

    } catch (err) {
        console.error('❌ Errore nel recupero prenotazioni:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// ENDPOINT: Lista file media (immagini/video)
// ============================================
app.get('/api/media-list', (req, res) => {
    const mediaDir = path.join(__dirname, 'client/public/media');

    fs.readdir(mediaDir, (err, files) => {
        if (err) {
            console.error('❌ Errore lettura cartella media:', err);
            // Se la cartella non esiste o errore, restituisci array vuoto
            return res.json([]);
        }

        // Filtra solo file immagini/video supportati
        const mediaFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ['.jpg', '.jpeg', '.png', '.gif', '.mp4', '.webm'].includes(ext);
        });

        res.json(mediaFiles);
    });
});

// ============================================
// ENDPOINT: Health check
// ============================================
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date(),
        server: 'Visitor Management System'
    });
});

// 3. ROTTA CATCH-ALL (Per far funzionare React)
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

// Avvio server
app.listen(PORT, () => {
    console.log(`🚀 Server avviato su http://localhost:${PORT}`);
    console.log(`📡 API disponibili su http://localhost:${PORT}/api`);
});

// Gestione errori non catturati
process.on('unhandledRejection', (err) => {
    console.error('❌ Errore non gestito:', err);
});
