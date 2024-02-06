const { MongoClient } = require("mongodb");

// Replace the uri string with your connection string.
const uri = "mongodb://127.0.0.1:27017/";

const client = new MongoClient(uri);
let MongoDBConnectedDb = null;
async function run() {
  try {
     MongoDBConnectedDb = client.db('mciedb');
    
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

module.exports = MongoDBConnectedDb;