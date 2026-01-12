const mongoose = require('mongoose');

const connectDb = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://balramprajapati3263:GSfhxWLajAUiT4Q0@nodeg.x9gffle.mongodb.net/';
    await mongoose.connect(mongoUri, {
      dbName: 'DevMeet'
    });
    return true;
  } catch (error) {
    process.exit(1);
  }
};

module.exports = connectDb;