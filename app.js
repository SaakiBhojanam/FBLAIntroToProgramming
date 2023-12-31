// Import required modules
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');

// Create an Express application
const app = express();
const port = 50000;

// Connect to an SQLite in-memory database
const db = new sqlite3.Database(':memory:');

// Create a table for GPA records
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS GPARecords (
            id INTEGER PRIMARY KEY,
            userId TEXT,
            date TEXT DEFAULT CURRENT_TIMESTAMP,
            grades TEXT,
            gradingSystems TEXT,
            gpa REAL
        )
    `);
});

// Middleware for parsing JSON
app.use(bodyParser.json());

// Serve HTML page
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.get('/graph.html', (req, res) => {
    res.sendFile(__dirname + '/graph.html');
});

// Endpoint to save GPA record
app.post('/api/saveGPA', (req, res) => {
    const { userId, grades, gradingSystems } = req.body;

    // Function to calculate grade points based on a basic grading scale
    function calculateGradePoints(grade, gradingSystem) {
        if (gradingSystem === 'standard') {
            if (grade >= 90) return 4.0;
            else if (grade >= 80) return 3.0;
            else if (grade >= 70) return 2.0;
            else if (grade >= 60) return 1.0;
            else return 0.0;
        } else if (gradingSystem === 'SB') {
            return grade;
        }
    }

    // Calculate GPA based on received grades and grading systems
    const totalCredits = grades.length;
    const totalPoints = grades.reduce((sum, grade, index) => sum + calculateGradePoints(grade, gradingSystems[index]), 0);
    const gpa = totalPoints / totalCredits;

    // Prepare and execute SQL statement to insert GPA record
    const stmt = db.prepare('INSERT INTO GPARecords (userId, grades, gradingSystems, gpa) VALUES (?, ?, ?, ?)');
    stmt.run(userId, JSON.stringify(grades), JSON.stringify(gradingSystems), gpa.toFixed(2));
    stmt.finalize();

    res.status(201).json({ message: 'GPA record saved successfully' });
});

// Endpoint to get GPA records for a user
app.get('/api/getGPA/:userId', (req, res) => {
    const userId = req.params.userId;

    // Retrieve GPA records for a user from the database
    db.all('SELECT * FROM GPARecords WHERE userId = ? ORDER BY date DESC', userId, (err, rows) => {
        if (err) {
            res.status(500).json({ error: 'Error retrieving GPA records' });
            return;
        }

        res.json(rows);
    });
});


// Start the server
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
