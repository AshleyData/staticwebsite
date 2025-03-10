const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

// Serve static files from the public directory
app.use(express.static('public'));

// Handle all routes by trying to serve the corresponding HTML file
app.get('*', (req, res) => {
    // Remove trailing slash and add .html
    let filePath = req.path.replace(/\/$/, '');
    if (!path.extname(filePath)) {
        filePath += '.html';
    }

    // Try to serve the file
    res.sendFile(path.join(__dirname, 'public', filePath), err => {
        if (err) {
            // If file not found, try index.html in that directory
            const indexPath = path.join(path.dirname(filePath), 'index.html');
            res.sendFile(path.join(__dirname, 'public', indexPath), err => {
                if (err) {
                    res.status(404).send('Page not found');
                }
            });
        }
    });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
}); 