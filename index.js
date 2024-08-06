const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const mongoose = require('mongoose');

const connectToDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');
  } catch (err) {
    console.error(err);
  }
};
connectToDatabase();

app.use(cors());
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const userSchema = new mongoose.Schema({
  username: { type: String, required: true }
});
const User = mongoose.model("User", userSchema);

const exerciseSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  description: String,
  duration: { type: Number, min: [1, 'Duration must be a positive number'] },
  date: Date
});
const Exercise = mongoose.model("Exercise", exerciseSchema);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/users', async (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: 'Username is required!' });
  }

  try {
    const newUser = new User({ username });
    await newUser.save();
    console.log('User saved to database');

    res.json({ _id: newUser._id, username: newUser.username });
  } catch (err) {
    console.error('Error saving user:', err);
    res.status(500).json({ error: 'Failed to save user' });
  }
});

app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find();

    res.json(
      users.map(user => ({
        _id: user._id,
        username: user.username
      }))
    );

  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.post('/api/users/:_id/exercises', async (req, res) => {
  const { _id } = req.params;
  const { description, duration, date } = req.body;

  if (!description || !duration) {
    return res.status(400).json({ error: 'Fields (description, duration) are required!' });
  }

  try {

    const user = await User.findById(_id);

    const newExercise = new Exercise({
      user_id: user.id,
      description,
      duration,
      date: date || new Date()
    });
    
    await newExercise.save();
    console.log('Exercise saved to database ', newExercise);

    res.json({
      _id: user._id,
      username: user.username,
      date: new Date(newExercise.date).toDateString(),
      duration: newExercise.duration,
      description: newExercise.description
    });
  } catch (err) {
    console.error('Error saving exercise:', err);
    res.status(500).json({ error: 'Failed to save exercise' });
  }
});

app.get('/api/users/:_id/logs', async (req, res) => {
  const { _id } = req.params;
  const { from, to, limit } = req.query;

  try {
    const user = await User.findById(_id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let exercises;

    if (from && to) {
      exercises = await Exercise.find({
        user_id: _id,
        date: { $gte: new Date(from), $lte: new Date(to) }
      }).limit(parseInt(limit) || 0);
    } else {
      exercises = await Exercise.find({ user_id: user._id }).limit(parseInt(limit) || 0);
    } 

    await res.json({
      _id: user._id,
      username: user.username,
      count: exercises.length,
      log: exercises.map(ex => ({
        description: ex.description,
        duration: ex.duration,
        date: new Date(ex.date).toDateString()
      }))
    });
  } catch (err) {
    console.error('Error retrieving exercise log:', err);
    res.status(500).json({ error: 'Failed to retrieve exercise log' });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
});
