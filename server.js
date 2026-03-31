const app = require('./api/index');

const port = Number(process.env.PORT) || 5000;

app.listen(port, () => {
  console.log(`Backend running on port ${port}`);
});
