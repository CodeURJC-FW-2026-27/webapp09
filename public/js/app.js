const express = require('express');
const mustacheExpress = require('mustache-express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.engine('mustache', mustacheExpress());
app.set('view engine', 'mustache');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.render('index');
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
