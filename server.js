const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');


const app = express();
const port = 3000;


app.use(bodyParser.json());


mongoose.connect('mongodb+srv://inbasagar7399:FTvatrNeaTabVTSL@capstone.6ralo.mongodb.net/Mentor-Student', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'Connection error:'));
db.once('open', () => {
    console.log('Connected to MongoDB');
});


const mentorSchema = new mongoose.Schema({
    name: { type: String, required: true },
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
});

const studentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    mentor: { type: mongoose.Schema.Types.ObjectId, ref: 'Mentor', default: null },
    previousMentors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Mentor' }], 
});

const Mentor = mongoose.model('Mentor', mentorSchema);
const Student = mongoose.model('Student', studentSchema);


app.post('/mentors', async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ message: 'Name is required' });

        const mentor = new Mentor({ name });
        await mentor.save();
        res.status(201).json({ message: 'Mentor created', mentor });
    } catch (error) {
        res.status(500).json({ message: 'Error creating mentor', error });
    }
});


app.post('/students', async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ message: 'Name is required' });

        const student = new Student({ name });
        await student.save();
        res.status(201).json({ message: 'Student created', student });
    } catch (error) {
        res.status(500).json({ message: 'Error creating student', error });
    }
});

app.post('/assign-students', async (req, res) => {
    try {
        const { mentorId, studentIds } = req.body;

        if (!mentorId || !studentIds || !Array.isArray(studentIds)) {
            return res.status(400).json({ message: 'Mentor ID and student IDs are required' });
        }

        const mentor = await Mentor.findById(mentorId);
        if (!mentor) return res.status(404).json({ message: 'Mentor not found' });

        const students = await Student.find({ _id: { $in: studentIds }, mentor: null });
        if (!students.length) return res.status(400).json({ message: 'No available students found' });

        students.forEach(student => {
            student.mentor = mentorId;
            mentor.students.push(student._id);
            student.save();
        });
        await mentor.save();

        res.status(200).json({ message: 'Students assigned to mentor', mentor });
    } catch (error) {
        res.status(500).json({ message: 'Error assigning students', error });
    }
});


app.post('/change-mentor', async (req, res) => {
    try {
        const { studentId, mentorId } = req.body;

        if (!studentId || !mentorId) {
            return res.status(400).json({ message: 'Student ID and mentor ID are required' });
        }

        const student = await Student.findById(studentId);
        const mentor = await Mentor.findById(mentorId);

        if (!student) return res.status(404).json({ message: 'Student not found' });
        if (!mentor) return res.status(404).json({ message: 'Mentor not found' });

        if (student.mentor) {
            student.previousMentors.push(student.mentor);
        }

        student.mentor = mentorId;
        await student.save();

        mentor.students.push(studentId);
        await mentor.save();

        res.status(200).json({ message: 'Mentor assigned/changed for student', student });
    } catch (error) {
        res.status(500).json({ message: 'Error changing mentor', error });
    }
});


app.get('/mentors/:mentorId/students', async (req, res) => {
    try {
        const { mentorId } = req.params;

        const mentor = await Mentor.findById(mentorId).populate('students');
        if (!mentor) return res.status(404).json({ message: 'Mentor not found' });

        res.status(200).json({ students: mentor.students });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching students', error });
    }
});


app.get('/students/:studentId/previous-mentors', async (req, res) => {
    try {
        const { studentId } = req.params;

        const student = await Student.findById(studentId).populate('previousMentors');
        if (!student) return res.status(404).json({ message: 'Student not found' });

        res.status(200).json({ previousMentors: student.previousMentors });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching previous mentors', error });
    }
});


app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
