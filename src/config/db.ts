import mongoose from 'mongoose';

export const connectDB = async (): Promise<void> => {
   try {
      const mongoUri = process.env.MONGO_URI;
      if (!mongoUri) {
         throw new Error("FATAL: MONGO_URI is not defined in environment variables!");
      }

      const connect = await mongoose.connect(mongoUri);
      console.log(`MongoDB Successfully Connected: ${connect.connection.host}`);
      console.log(`Database Name: ${connect.connection.name}`);
   } catch (error: any) {
      console.error("Database Connection Failed:", error.message || error);
      process.exit(1);
   }
};