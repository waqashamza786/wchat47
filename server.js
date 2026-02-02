const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(__dirname));

// Serve index.html for all routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`
    ╔══════════════════════════════════════╗
    ║      EliteChat Server Running       ║
    ╠══════════════════════════════════════╣
    ║  Port: ${PORT}                           ║
    ║  URL: http://localhost:${PORT}          ║
    ╠══════════════════════════════════════╣
    ║  Features:                          ║
    ║  • Real-time Chat                  ║
    ║  • Admin Panel                     ║
    ║  • Premium UI/UX                   ║
    ║  • Firebase Integration            ║
    ╚══════════════════════════════════════╝
    `);
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Handle 404
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'index.html'));
});