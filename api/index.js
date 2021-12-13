const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const { config } = require('./config');
const cors = require('cors');

app = express();

app.use(bodyParser.json());
app.use(cors());

app.post("/api/auth/token", (req, res) => {
    const { email, username, name } = req.body;
    token = jwt.sign({ sub: username, email, name}, config.authJwtSecret);
    res.json({ access_token: token});
});

const server = app.listen(5000, () => {
    console.log(`Listening on http://localhost:${server.address().port}`);
});