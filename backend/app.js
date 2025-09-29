const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const speech = require('@google-cloud/speech');
const DataModel = require('./models/DataModel');
const path = require('path');
const crypto = require("crypto");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 3002;

function generateRandomId() {
    return crypto.randomBytes(16).toString('hex');
}

mongoose.connect('mongodb://localhost:27017/users');

app.use(express.json());
app.use(cors());
app.use('/uploads/audio', express.static(path.join(__dirname, 'uploads/audio')));
app.use('/uploads/video', express.static(path.join(__dirname, 'uploads/video')));

// Multer setup for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        console.log('Incoming field:', file.fieldname, 'Mimetype:', file.mimetype);
        if (file.fieldname === 'voice') {
            cb(null, 'uploads/audio');
        } else if (file.fieldname === 'video') {
            cb(null, 'uploads/video');
        } else {
            cb({ message: 'Unsupported file type' }, false);
        }
    },
    filename: function (req, file, cb) {
        const extFull = file.mimetype.split('/')[1] || 'webm';
        const ext = extFull.split(';')[0];
        const newFileName = `${generateRandomId()}-${Date.now()}.${ext}`;
        cb(null, newFileName);
    },
});

const upload = multer({ storage: storage });

app.post('/upload', upload.fields([{ name: 'voice', maxCount: 1 }, { name: 'video', maxCount: 1 }]), async (req, res) => {
    try {
        const { latitude, longitude } = req.body;
        const voice = req.files['voice'] ? req.files['voice'][0].path : null;

        console.log('Upload request body:', req.body);
        console.log('Upload files:', req.files);
        console.log('Voice file path:', voice);
        console.log('Coordinates:', { latitude, longitude });

        if (!voice) {
            return res.status(400).send({ message: 'Voice file missing!' });
        }

        const normalizedVoicePath = voice.replace(/\\+/g, '/');
        console.log('Saved voice file:', normalizedVoicePath);

        // Try to run read_audio — fallback if fails
        let text = '';
        try {
            const { read_audio } = await import('./auido.mjs');
            text = await read_audio(`${normalizedVoicePath}`);
            console.log('Extracted text:', text);
        } catch (err) {
            console.error('read_audio failed:', err);
            text = 'Unknown emergency';
        }

        // Try to run sendMessage for severity — fallback if fails
        let severity = 5;
        try {
            const { sendMessage } = await import('./message.mjs');
            const severityText = await sendMessage(`give the following emergency: ${text} a severity score from 1 to 10 according to the american criterias, 1 is the highest, 10 is the lowest, give me a number nothing else`);
            const parsedSeverity = parseFloat(severityText.trim());
            if (!isNaN(parsedSeverity) && parsedSeverity >= 1 && parsedSeverity <= 10) {
                severity = parsedSeverity;
            } else {
                console.warn('Invalid severity response, using default 5');
                severity = 5;
            }
            console.log('Extracted severity:', severity);
        } catch (err) {
            console.error('sendMessage failed for severity:', err);
            severity = 5;
        }

        // Try to run sendMessage for concise text — fallback if fails
        let text_converted = text;
        try {
            const { sendMessage } = await import('./message.mjs');
            text_converted = await sendMessage(`give the following emergency: ${text} a concise description with no more than three words`);
            console.log('Converted text:', text_converted);
        } catch (err) {
            console.error('sendMessage failed for text:', err);
            text_converted = text.substring(0, 50); // Fallback to first 50 chars
        }

        // Create the data object with proper structure
        const dataToSave = {
            voice: normalizedVoicePath ? path.relative('uploads', normalizedVoicePath).replace(/\\/g, '/') : null,
            text: text_converted || 'Emergency call',
            gpsCoords: {
                latitude: parseFloat(latitude) || 0,
                longitude: parseFloat(longitude) || 0,
            },
            score: severity,
        };

        console.log('Data to save:', JSON.stringify(dataToSave, null, 2));

        // Create and save the record
        const newData = new DataModel(dataToSave);
        const savedData = await newData.save();
        
        console.log('Saved data to database:', JSON.stringify(savedData.toObject(), null, 2));

        // Send back response
        const responseData = {
            id: savedData._id,
            voice: savedData.voice,
            video: savedData.video,
            gpsCoords: savedData.gpsCoords,
            score: savedData.score,
            createdAt: savedData.createdAt,
            updatedAt: savedData.updatedAt,
            text: savedData.text,
        };

        res.status(201).send(responseData);

    } catch (error) {
        console.error('Upload failed:', error);
        res.status(500).send({ message: 'Upload failed', error: error.message });
    }
});

app.get("/uploads", async (req, res) => {
    try {
        const allData = await DataModel.find({}).sort({ createdAt: -1, timestamp: -1 });
        console.log('Found records:', allData.length);
        if (allData.length > 0) {
            console.log('Sample record fields:', Object.keys(allData[0].toObject()));
            console.log('Sample record:', JSON.stringify(allData[0].toObject(), null, 2));
        }
        
        const responseData = allData.map(data => {
            const dataObj = data.toObject();
            return {
                id: dataObj._id,
                voice: dataObj.voice || null,
                video: dataObj.video || null,
                text: dataObj.text || 'Unknown emergency',
                gpsCoords: dataObj.gpsCoords || { latitude: 0, longitude: 0 },
                score: dataObj.score || 10,
                createdAt: dataObj.createdAt || dataObj.timestamp || new Date(),
                updatedAt: dataObj.updatedAt || dataObj.timestamp || new Date()
            };
        });
        
        console.log('Sending response sample:', JSON.stringify(responseData[0], null, 2));
        res.status(200).send(responseData);
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).send({ message: 'Failed to fetch data', error: error.message });
    }
});

app.get("/audio", async (req, res) => {
    try {
        const { read_audio } = await import('./auido.mjs');
        const text = await read_audio("uploads/audio/audio_case.mp3");
        res.send(text);
    } catch (error) {
        console.error('Audio processing failed:', error);
        res.status(500).send({ message: 'Audio processing failed', error: error.message });
    }
});

app.get('/uploads/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const data = await DataModel.findById(id);

        if (!data) {
            return res.status(404).send({ message: 'Data not found' });
        }

        const responseData = {
            id: data._id,
            voice: data.voice,
            video: data.video,
            text: data.text,
            gpsCoords: data.gpsCoords,
            score: data.score,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
        };

        res.status(200).send(responseData);
    } catch (error) {
        console.error('Error fetching data by ID:', error);
        res.status(400).send({ message: 'Invalid ID format' });
    }
});

app.delete('/uploads/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const deletedData = await DataModel.findByIdAndDelete(id);

        if (!deletedData) {
            return res.status(404).send({ message: 'Data not found' });
        }

        res.status(200).send({ message: 'Data successfully deleted', id: deletedData._id });
    } catch (error) {
        console.error('Error deleting data:', error);
        res.status(400).send({ message: 'Invalid ID format' });
    }
});

app.get('/delete-all-db', async (req, res) => {
    try {
        const result = await DataModel.deleteMany({});
        res.json({ 
            message: 'Database cleared!', 
            deletedCount: result.deletedCount 
        });
    } catch (error) {
        res.json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});