require('dotenv').config()
const app = require("./app");
const http = require("http");
// Path updated to look at the package.json level
const serviceAccount = require('../firebase-service-account.json');


const { initializeApp, cert } = require("firebase-admin/app");


const server = http.createServer(app);

const PORT = process.env.PORT || 3001;



// Call initializeApp and cert directly, without the "admin." prefix
initializeApp({
  credential: cert(serviceAccount)
});


server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});